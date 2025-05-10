import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';

// Add window.ethereum type declaration
declare global {
  interface Window {
    ethereum: any;
  }
}

const CONTRACT_ADDRESS = "0x6408b1A5234b0c18727001ab5931FDf511D56ADb";

// Monad chain configuration
const MONAD_CHAIN = {
  chainId: '0x279F', // 10143 in hex
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MONAD',
    decimals: 18
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://explorer.monad.xyz']
};

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

interface OrderConfirmation {
  product: Product;
  quantity: number;
  totalPrice: string;
  isOpen: boolean;
}

export interface ProductListProps {
  onPurchaseSuccess?: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onPurchaseSuccess }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const checkChain = async () => {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask to use this feature");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    
    if (network.chainId !== BigInt(10143)) {
      throw new Error("Please connect to Monad Testnet to use this dApp");
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      await checkChain();

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
        const allProducts = await contract.getAllProducts();
        console.log("All products:", allProducts);

        const formattedProducts = allProducts.map((product: ProductDetails, index: number) => ({
          id: Number(product.id),
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

  const handleBuyClick = (product: Product) => {
    setOrderConfirmation({
      product,
      quantity: 1,
      totalPrice: product.price,
      isOpen: true
    });
  };

  const handleQuantityChange = (quantity: number) => {
    if (orderConfirmation) {
      const totalPrice = (Number(orderConfirmation.product.price) * quantity).toFixed(18);
      setOrderConfirmation({
        ...orderConfirmation,
        quantity,
        totalPrice
      });
    }
  };

  const handlePurchase = async () => {
    if (!orderConfirmation) return;

    try {
      setPurchasing(orderConfirmation.product.id);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      await checkChain();

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

      // Convert productId to BigInt since the contract expects uint256
      const productIdBigInt = BigInt(orderConfirmation.product.id);
      
      // Create arrays for productIds and quantities
      const productIds = [productIdBigInt];
      const quantities = [BigInt(orderConfirmation.quantity)];

      // Convert price to wei
      const priceInWei = ethers.parseEther(orderConfirmation.totalPrice);

      console.log("Transaction parameters:", {
        productIds,
        quantities,
        value: priceInWei.toString()
      });

      // Estimate gas first
      const gasEstimate = await contract.placeOrder.estimateGas(
        productIds,
        quantities,
        { value: priceInWei }
      );

      // Add 20% to gas estimate for safety
      const gasLimit = gasEstimate * BigInt(12) / BigInt(10);

      // Call the placeOrder function with arrays
      const tx = await contract.placeOrder(productIds, quantities, {
        value: priceInWei,
        gasLimit
      });

      console.log("Transaction sent:", tx.hash);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setPurchaseSuccess(true);
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
        await loadProducts(); // Refresh the product list
        setOrderConfirmation(null); // Close the confirmation modal
        
        // Show success message for 3 seconds
        setTimeout(() => {
          setPurchaseSuccess(false);
        }, 3000);
      } else {
        throw new Error("Transaction failed");
      }
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
      {/* Success Message */}
      {purchaseSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative animate-fade-in-out" role="alert">
          <strong className="font-bold">Success! </strong>
          <span className="block sm:inline">Your purchase was completed successfully.</span>
        </div>
      )}

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
                  onClick={() => handleBuyClick(product)}
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

      {/* Order Confirmation Modal */}
      {orderConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-[#222] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Your Order</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">Product</p>
                <p className="text-white font-semibold">{orderConfirmation.product.name}</p>
              </div>

              <div>
                <p className="text-gray-400">Price per item</p>
                <p className="text-white font-semibold">{orderConfirmation.product.price} ETH</p>
              </div>

              <div>
                <p className="text-gray-400">Quantity</p>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-2 py-1 bg-blue-600 text-white rounded"
                    onClick={() => handleQuantityChange(Math.max(1, orderConfirmation.quantity - 1))}
                  >
                    -
                  </button>
                  <span className="text-white">{orderConfirmation.quantity}</span>
                  <button 
                    className="px-2 py-1 bg-blue-600 text-white rounded"
                    onClick={() => handleQuantityChange(orderConfirmation.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <p className="text-gray-400">Total Price</p>
                <p className="text-white font-semibold">{orderConfirmation.totalPrice} ETH</p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                onClick={() => setOrderConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                onClick={handlePurchase}
                disabled={purchasing !== null}
              >
                {purchasing !== null ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 