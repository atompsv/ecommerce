import { useState } from 'react';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';

const CONTRACT_ADDRESS = "0xeff0393d86F712920f66388477a8C5362C15f265";

interface AddProductProps {
  onClose: () => void;
  onProductAdded?: () => void;
}

export function AddProduct({ onClose, onProductAdded }: AddProductProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      // Request account access first
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create contract instance with the correct ABI
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function addProduct(string memory name, uint256 price, uint256 stock) external",
          "function registeredSellers(address) view returns (bool)"
        ],
        signer
      );

      // Validate inputs
      if (!name.trim()) {
        throw new Error("Product name is required");
      }

      const priceInWei = ethers.parseEther(price);
      if (priceInWei <= 0) {
        throw new Error("Price must be greater than 0");
      }

      const stockNumber = parseInt(stock);
      if (isNaN(stockNumber) || stockNumber <= 0) {
        throw new Error("Stock must be a positive number");
      }

      // Add product
      const tx = await contract.addProduct(
        name.trim(),
        priceInWei,
        stockNumber,
        { gasLimit: 500000 }
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Product added successfully:", receipt);

      // Store the product data before resetting
      const productData = { name, price, stock };

      // Reset form
      setName('');
      setPrice('');
      setStock('');

      // Close the modal
      onClose();

      // If onProductAdded is provided, call it after a delay
      if (onProductAdded) {
        setTimeout(() => {
          try {
            onProductAdded();
          } catch (err) {
            console.error("Error refreshing product list:", err);
          }
        }, 100);
      }

    } catch (err) {
      console.error("Error adding product:", err);
      if (err instanceof Error) {
        if (err.message.includes("user rejected")) {
          setError("Transaction was rejected. Please try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to add product. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#222] rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Add New Product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Product Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#333] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter product name"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">
              Price (ETH)
            </label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.000000000000000001"
              min="0"
              className="w-full px-3 py-2 bg-[#333] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter price in ETH"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-300 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              id="stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              min="1"
              className="w-full px-3 py-2 bg-[#333] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter stock quantity"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 