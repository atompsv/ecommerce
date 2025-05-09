import React, { useState } from 'react';

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
  seller: string;
  image?: string;
}

interface OrderProps {
  product: Product;
  onClose: () => void;
  onConfirm: (orderDetails: {
    productId: number;
    quantity: number;
    totalPrice: string;
  }) => void;
  quantity: number;
}

export const Order = ({ product, onClose, onConfirm, quantity: initialQuantity }: OrderProps) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [step, setStep] = useState<'details' | 'confirm'>('details');

  const totalPrice = (parseFloat(product.price) * quantity).toFixed(4);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= product.stock) {
      setQuantity(value);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      productId: product.id,
      quantity,
      totalPrice
    });
  };

  return (
    <div className="min-h-screen bg-[#111] py-4">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-[#333] pb-3">
          <h1 className="text-xl font-bold text-white">
            {step === 'details' ? 'Order Details' : 'Confirm Order'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'details' ? (
          <div className="bg-[#222] rounded-lg p-4 space-y-4">
            {/* Product Info */}
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-700 rounded-lg flex-shrink-0">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">{product.name}</h3>
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-gray-400">
                    Price: <span className="text-white">{product.price} ETH</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Available: <span className="text-white">{product.stock} units</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-1.5">
                Quantity
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  className="px-3 py-1.5 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  max={product.stock}
                  className="w-20 px-3 py-1.5 bg-[#333] border border-[#444] rounded-lg text-white text-center focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => quantity < product.stock && setQuantity(quantity + 1)}
                  className="px-3 py-1.5 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-[#333]">
              <div className="flex justify-between items-center">
                <span className="text-base text-gray-300">Total:</span>
                <span className="text-xl font-bold text-white">{totalPrice} ETH</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#222] rounded-lg p-4 space-y-4">
            {/* Order Summary */}
            <div className="bg-[#333] rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-medium text-white">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Product:</span>
                  <span className="text-white">{product.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Quantity:</span>
                  <span className="text-white">{quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Price per unit:</span>
                  <span className="text-white">{product.price} ETH</span>
                </div>
                <div className="pt-3 border-t border-[#444] flex justify-between items-center">
                  <span className="text-base text-gray-300">Total:</span>
                  <span className="text-xl font-bold text-white">{totalPrice} ETH</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="px-4 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 