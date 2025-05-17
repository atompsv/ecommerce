import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';
import { FaHeart, FaRegHeart, FaPlus, FaStar, FaSearch, FaSlidersH, FaMinus } from 'react-icons/fa';

// Add window.ethereum type declaration
declare global {
  interface Window {
    ethereum: any;
  }
}

const CONTRACT_ADDRESS = "0xefbE9638c138417F1c1406DcF87913a060e3eB8a";

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

// Add Toast interface
interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export interface ProductListProps {
  onPurchaseSuccess?: () => void;
}

// Add animation variants
const cardVariants = {
  hidden: { 
    opacity: 0,
    y: 10,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      mass: 0.8
    }
  },
  hover: {
    scale: 1.01,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
      mass: 0.8
    }
  }
};

export const ProductList: React.FC<ProductListProps> = ({ onPurchaseSuccess }) => {
  const { addToCart, items, seller, updateQuantity } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [quantitySelectors, setQuantitySelectors] = useState<Record<number, number>>({});

  // Filtered products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    p.available && // Only show available products
    p.stock > 0    // Only show products with stock
  );

  // Add toast functions
  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Add dismiss toast function
  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleError = (error: any) => {
    console.error("Error:", error);
    let message = "An unexpected error occurred";

    if (error.message) {
      if (error.message.includes("user rejected")) {
        message = "Transaction was cancelled";
      } else if (error.message.includes("insufficient funds")) {
        message = "Insufficient funds for this transaction";
      } else if (error.message.includes("gas required exceeds allowance")) {
        message = "Transaction would fail due to gas limit";
      } else if (error.message.includes("execution reverted")) {
        message = "Transaction failed: " + error.message.split("execution reverted:")[1]?.trim() || "Unknown reason";
      }
    }

    addToast('error', message);
  };

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

      const productIdBigInt = BigInt(orderConfirmation.product.id);
      const productIds = [productIdBigInt];
      const quantities = [BigInt(orderConfirmation.quantity)];
      const priceInWei = ethers.parseEther(orderConfirmation.totalPrice);

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

      addToast('success', 'Transaction submitted! Waiting for confirmation...');

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        addToast('success', 'Purchase completed successfully!');
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
        await loadProducts();
        setOrderConfirmation(null);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      handleError(err);
    } finally {
      setPurchasing(null);
    }
  };

  const handleAddToCart = (product: Product) => {
    try {
      console.log('Adding product to cart:', product);
      
      // Check if product is available
      if (!product.available || product.stock <= 0) {
        addToast('error', 'Product is not available');
        return;
      }

      // Add to cart
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        seller: product.seller
      });
      
      // Show success message
      addToast('success', `${product.name} added to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      addToast('error', 'Failed to add to cart');
    }
  };

  const toggleQuantitySelector = (productId: number) => {
    setQuantitySelectors(prev => {
      const newState = { ...prev };
      if (newState[productId]) {
        delete newState[productId];
      } else {
        newState[productId] = 1;
      }
      return newState;
    });
  };

  const updateQuantitySelector = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantitySelectors(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
  };

  // Toggle favorite (UI only)
  const toggleFavorite = (id: number) => {
    setFavorites(favs => favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]);
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
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Bar & Filter */}
      <div className="flex items-center gap-3 mt-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white text-gray-900 placeholder-gray-400 shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {/* <button
          className="p-3 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 text-white shadow hover:scale-105 transition-transform"
          onClick={() => setShowFilter(f => !f)}
        >
          <FaSlidersH />
        </button> */}
      </div>

      {/* Results Count */}
      {/* <div className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
        Found {filteredProducts.length} results
      </div> */}

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            custom={index}
            className="relative bg-white rounded-2xl shadow-lg p-3 flex flex-col min-h-[260px]"
          >
            {/* Heart Icon */}
            <button
              className="absolute top-3 right-3 z-10"
              onClick={() => toggleFavorite(product.id)}
            >
              {favorites.includes(product.id) ? (
                <FaHeart className="text-red-500 text-xl" />
              ) : (
                <FaRegHeart className="text-gray-300 text-xl" />
              )}
            </button>

            {/* Product Image Placeholder */}
            <div className="flex items-center justify-center h-24 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Product Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-base line-clamp-1">{product.name}</span>
                  <span className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                    <FaStar className="inline" />
                    {(4 + (product.id % 2) * 0.7).toFixed(1)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-2">{product.seller.slice(0, 8)}...{product.seller.slice(-4)}</div>
                <div className="text-xs text-gray-500 mb-2">
                  Stock: <span className={product.stock > 0 ? "text-green-500" : "text-red-500"}>{product.stock}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold text-blue-500">${formatPrice(product.price)}</span>
                <button
                  className={`rounded-full p-2 shadow-lg transition-transform ${
                    product.stock > 0 
                      ? "bg-gradient-to-tr from-blue-500 to-purple-500 hover:scale-110" 
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                  onClick={() => handleAddToCart(product)}
                  disabled={seller !== null && seller !== product.seller || product.stock === 0}
                >
                  <FaPlus className={`text-lg ${product.stock > 0 ? "text-white" : "text-gray-400"}`} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}; 