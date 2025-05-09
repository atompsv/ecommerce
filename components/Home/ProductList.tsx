import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';

// Add window.ethereum type declaration
declare global {
  interface Window {
    ethereum: any;
  }
}

const CONTRACT_ADDRESS = "0xeff0393d86F712920f66388477a8C5362C15f265";

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  available: boolean;
  seller: string;
}

interface ProductDetails {
  id: bigint;
  seller: string;
  name: string;
  price: bigint;
  available: boolean;
  stock: bigint;
}

export interface ProductListProps {
  onPurchaseSuccess: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onPurchaseSuccess }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function getAllProducts() view returns (tuple(uint256 id, address seller, string name, uint256 price, bool available, uint256 stock)[])",
          "function nextProductId() view returns (uint256)",
          "function placeOrder(uint256[] productIds, uint256[] quantities) payable",
          "function getProductDetails(uint256 productId) view returns (uint256 id, address seller, string name, uint256 price, bool available, uint256 stock)"
        ],
        provider
      );

      try {
        // Get all products in one call
        const allProducts = await contract.getAllProducts();
        console.log("All products:", allProducts);

        // Transform the data
        const formattedProducts = allProducts.map((product: ProductDetails, index: number) => ({
          id: index + 1,
          name: product.name,
          price: ethers.formatEther(product.price),
          stock: Number(product.stock),
          available: product.available,
          seller: product.seller
        }));

        console.log("Formatted products:", formattedProducts);
        setProducts(formattedProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
        setProducts([]);
      }
    } catch (err) {
      console.error("Error loading products:", err);
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();

    // Listen for product added event
    const handleProductAdded = () => {
      loadProducts();
    };

    window.addEventListener('productAdded', handleProductAdded);

    return () => {
      window.removeEventListener('productAdded', handleProductAdded);
    };
  }, []);

  const handlePurchase = async (productId: number, price: string) => {
    try {
      setPurchasing(productId);
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

      const tx = await contract.placeOrder(productId, {
        value: ethers.parseUnits(price, 18)
      });

      await tx.wait();
      onPurchaseSuccess();
      await loadProducts(); // Refresh the product list
    } catch (err) {
      console.error("Error purchasing product:", err);
      setError(err instanceof Error ? err.message : "Failed to purchase product");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Available Products</h2>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="bg-[#222] rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
          >
            {/* Product Image */}
            <div className="relative h-24 bg-gray-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="absolute top-1.5 left-1.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  product.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.available ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">#{product.id}</span>
                <span className="text-xs text-gray-400">Stock: {product.stock}</span>
              </div>
              
              <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{product.name}</h3>
              
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-base font-bold text-blue-400">
                  {product.price} ETH
                </div>
              </div>

              {product.available && (
                <button 
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center justify-center gap-1.5"
                  onClick={() => handlePurchase(product.id, product.price)}
                  disabled={purchasing === product.id}
                >
                  {purchasing === product.id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Buy Now
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 