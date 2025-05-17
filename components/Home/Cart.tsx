import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';
import { ethers } from 'ethers';

// Add price formatting function
const formatPrice = (price: string): string => {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  
  // If the number is very small (less than 0.0001), show more decimal places
  if (num < 0.0001) {
    return num.toFixed(6);
  }
  
  // Remove trailing zeros after decimal point
  return num.toString().replace(/\.?0+$/, '');
};

interface CartProps {
  onClose: () => void;
}

const CONTRACT_ADDRESS = "0xefbE9638c138417F1c1406DcF87913a060e3eB8a";

export const Cart: React.FC<CartProps> = ({ onClose }) => {
  const { items, totalPrice, removeFromCart, updateQuantity } = useCart();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group items by seller
  const itemsBySeller = items.reduce((acc, item) => {
    if (!acc[item.seller]) {
      acc[item.seller] = [];
    }
    acc[item.seller].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const handlePurchase = async (sellerItems: typeof items) => {
    if (sellerItems.length === 0) return;

    try {
      setPurchasing(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function placeOrder(uint256[] productIds, uint256[] quantities) payable",
          "function getAllProducts() view returns (tuple(uint256 id, address seller, string name, uint256 price, bool available, uint256 stock)[])",
          "function nextProductId() view returns (uint256)",
          "function getProductDetails(uint256 productId) view returns (uint256 id, address seller, string name, uint256 price, bool available, uint256 stock)"
        ],
        signer
      );

      const productIds = sellerItems.map(item => BigInt(item.productId));
      const quantities = sellerItems.map(item => BigInt(item.quantity));
      
      // Calculate total price for this seller's items
      const sellerTotalPrice = sellerItems.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
      }, 0).toString();
      
      const priceInWei = ethers.parseEther(sellerTotalPrice);

      const gasEstimate = await contract.placeOrder.estimateGas(
        productIds,
        quantities,
        { value: priceInWei }
      );

      const gasLimit = gasEstimate * BigInt(12) / BigInt(10);

      const tx = await contract.placeOrder(productIds, quantities, {
        value: priceInWei,
        gasLimit
      });

      // Show success message
      alert('Transaction submitted! Waiting for confirmation...');

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        alert('Purchase completed successfully!');
        // Remove purchased items from cart
        sellerItems.forEach(item => removeFromCart(item.productId));
        onClose();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("Error during purchase:", err);
      setError(err instanceof Error ? err.message : "Failed to complete purchase");
    } finally {
      setPurchasing(false);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500">Add some items to your cart to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Group items by seller */}
      {Object.entries(itemsBySeller).map(([seller, sellerItems]) => (
        <div key={seller} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Seller: {seller.slice(0, 6)}...{seller.slice(-4)}
            </h2>
          </div>

          <div className="space-y-4">
            {sellerItems.map((item) => (
              <div key={item.productId} className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-gray-900 font-medium">{item.name}</h3>
                  <p className="text-blue-500">${formatPrice(item.price)}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FaMinus className="text-gray-600" />
                    </button>
                    <span className="text-gray-900 w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FaPlus className="text-gray-600" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    <FaTrash className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Order summary for this seller */}
            <div className="bg-white rounded-lg p-4 mt-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-900 font-semibold">Total for this seller</span>
                <span className="text-blue-500 font-bold text-xl">
                  ${formatPrice(sellerItems.reduce((total, item) => 
                    total + (parseFloat(item.price) * item.quantity), 0).toString()
                  )}
                </span>
              </div>
              <button
                className="w-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={sellerItems.length === 0 || purchasing}
                onClick={() => handlePurchase(sellerItems)}
              >
                {purchasing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 