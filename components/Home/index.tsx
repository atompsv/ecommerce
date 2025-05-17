"use client";

import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';
import { ProductList } from "./ProductList";
import { SellerDashboard } from "./SellerDashboard";
import { OrderHistory } from "./OrderHistory";
import { Delivery } from "./Delivery";
import { useCart } from '../../context/CartContext';
import { FaShoppingCart } from 'react-icons/fa';
import { Cart } from './Cart';

const CONTRACT_ADDRESS = "0xefbE9638c138417F1c1406DcF87913a060e3eB8a";

export default function Home() {
  const { isWalletAvailable, isFrameAvailable, actions } = useMiniAppContext();
  const { isConnected, address } = useAccount();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Check if user is a seller
  const checkSellerStatus = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function registeredSellers(address) view returns (bool)",
          "function getProductDetails(uint256 productId) external view returns (uint256 id, address seller, string memory name, uint256 price, bool available, uint256 stock)"
        ],
        provider
      );

      // Check if user is a registered seller
      const isUserSeller = await contract.registeredSellers(address);
      console.log("Is user seller:", isUserSeller);
      setIsSeller(isUserSeller);
    } catch (err) {
      console.error("Error checking seller status:", err);
      setError(err instanceof Error ? err.message : "Failed to check seller status");
    } finally {
      setLoading(false);
    }
  };

  // Register as seller
  const handleBecomeSeller = async () => {
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
          "function registerAsSeller() external",
          "function addProduct(string memory name, uint256 price, uint256 stock) external",
          "function getProductDetails(uint256 productId) external view returns (uint256 id, address seller, string memory name, uint256 price, bool available, uint256 stock)"
        ],
        signer
      );

      // Register as seller
      const tx = await contract.registerAsSeller({ gasLimit: 500000 });

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction successful:", receipt);

      // Check seller status after successful transaction
      await checkSellerStatus();
      setShowDashboard(true);
    } catch (err) {
      console.error("Error becoming seller:", err);
      if (err instanceof Error) {
        if (err.message.includes("user rejected")) {
          setError("Transaction was rejected. Please try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to become seller. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      checkSellerStatus();
    }
  }, [isConnected, address]);

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowCart(!showCart);
  };

  // Add this function to handle cart closing
  const handleCartClose = () => {
    setShowCart(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#f6f7fb] to-[#e9eaf3] relative">
      {/* Top Bar - Always Fixed */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30">
        {/* Hamburger Menu Button */}
        <button 
          className="text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Title and Cart */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">
            {showDashboard ? 'Seller Dashboard' : 
             showOrderHistory ? 'Order History' : 
             showDelivery ? 'Delivery Information' : 
             'Web3 Marketplace'}
          </h1>
          
          {/* Cart Button */}
          <button
            onClick={handleCartClick}
            className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FaShoppingCart className="h-6 w-6" />
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#232233] text-[#FFD700] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center p-0 leading-none">
                {items.reduce((total, item) => total + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Close Button */}
        <button
          className="text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => {
            if (actions?.close) {
              actions.close();
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Cart Modal */}
      {showCart && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 pt-14"
          onClick={handleCartClose}
        >
          <div 
            className="bg-white overflow-y-auto mx-5 rounded-2xl max-h-[100vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-6">
              <Cart onClose={handleCartClose} />
            </div>
          </div>
        </div>
      )}

      {/* Backdrop Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar Menu */}
      <div 
        className={`fixed top-14 left-0 h-[calc(100%-3.5rem)] w-64 bg-white border-r border-gray-200 shadow-lg z-20 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Content */}
        <div className="flex flex-col h-full">
          <div className="p-4 space-y-4">
            {/* Home Button */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              onClick={() => {
                setShowDashboard(false);
                setShowOrderHistory(false);
                setShowDelivery(false);
                setIsMenuOpen(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                Home
              </span>
            </button>

            {/* Order History Button */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              onClick={() => {
                setShowOrderHistory(true);
                setShowDashboard(false);
                setShowDelivery(false);
                setIsMenuOpen(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                Order History
              </span>
            </button>

            {/* Seller Dashboard Button */}
            {isConnected && isSeller && (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                onClick={() => {
                  setShowDashboard(true);
                  setShowOrderHistory(false);
                  setShowDelivery(false);
                  setIsMenuOpen(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                  Seller Dashboard
                </span>
              </button>
            )}

            {/* Become Seller Button */}
            {isConnected && !isSeller && (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleBecomeSeller}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center w-full">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Registering...
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm font-medium text-white">
                      Become a Seller
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Developer Tag */}
          <div className="mt-auto p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Developed by <span className="text-blue-500">atompsv</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-screen pt-14">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {isConnected ? (
          showDashboard ? (
            <SellerDashboard />
          ) : showOrderHistory ? (
            <OrderHistory />
          ) : (
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <ProductList />
            </div>
          )
        ) : (
          <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
            <p className="text-sm text-gray-400 text-center">
              Connect your wallet to start using the marketplace
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
