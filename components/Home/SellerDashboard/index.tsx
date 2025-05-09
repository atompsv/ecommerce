import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';
import { AddProduct } from '../AddProduct';

const CONTRACT_ADDRESS = "0xeff0393d86F712920f66388477a8C5362C15f265";

interface SellerDashboardProps {
  onClose: () => void;
}

export function SellerDashboard({ onClose }: SellerDashboardProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const checkRegistration = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SimpleEcommerce.abi,
        provider
      );

      const registered = await contract.registeredSellers(address);
      setIsRegistered(registered);
    } catch (err) {
      console.error("Error checking registration:", err);
      setError(err instanceof Error ? err.message : "Failed to check registration status");
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SimpleEcommerce.abi,
        signer
      );

      const tx = await contract.registerAsSeller();
      await tx.wait();
      
      setIsRegistered(true);
    } catch (err) {
      console.error("Error registering as seller:", err);
      if (err instanceof Error) {
        if (err.message.includes("user rejected")) {
          setError("Transaction was rejected. Please try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to register as seller");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRegistration();
  }, []);

  if (!isRegistered) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#222] rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Seller Registration</h2>
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

          <p className="text-gray-300 mb-6">
            You need to register as a seller to access the seller dashboard.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRegister}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Registering...
                </>
              ) : (
                'Register as Seller'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#222] rounded-lg p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Seller Dashboard</h2>
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

        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowAddProduct(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Add Product
          </button>
        </div>

        {showAddProduct && (
          <AddProduct
            onClose={() => setShowAddProduct(false)}
            onProductAdded={() => {
              setShowAddProduct(false);
              // You can add a callback here to refresh the product list if needed
            }}
          />
        )}
      </div>
    </div>
  );
} 