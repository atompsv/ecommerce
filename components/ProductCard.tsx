import React from 'react';

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
  seller: string;
  image?: string;
}

interface ProductCardProps {
  product: Product;
  onPurchase: (quantity: number) => void;
  isPurchasing: boolean;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPurchase,
  isPurchasing,
  quantity,
  onQuantityChange,
}) => {
  return (
    <div className="bg-[#222] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors h-full flex flex-col">
      {/* Image Placeholder */}
      <div className="w-full aspect-square bg-gray-700 relative flex-shrink-0">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="text-xs font-medium text-white mb-1.5 line-clamp-2 min-h-[2rem]">{product.name}</h3>
        
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-base font-bold text-blue-400">{product.price}</span>
          <span className="text-[10px] text-gray-400">ETH</span>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] text-gray-400 whitespace-nowrap">Stock: {product.stock}</span>
            <span className="text-[10px] text-gray-400">•</span>
            <span className="text-[10px] text-gray-400 truncate">{product.seller}</span>
          </div>
          <button
            onClick={() => onPurchase(quantity)}
            disabled={isPurchasing || !product.isActive || product.stock === 0}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              isPurchasing || !product.isActive || product.stock === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isPurchasing ? 'Processing...' : product.stock === 0 ? 'Out of Stock' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}; 