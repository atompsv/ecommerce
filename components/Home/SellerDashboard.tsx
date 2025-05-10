import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';
import { AddProduct } from './AddProduct';
import { EditProduct } from './EditProduct';

const CONTRACT_ADDRESS = "0x6408b1A5234b0c18727001ab5931FDf511D56ADb";

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
  image?: string;
}

interface Order {
  id: number;
  buyer: string;
  productIds: number[];
  quantities: number[];
  totalPaid: string;
  status: 'Pending' | 'Accepted' | 'Shipped' | 'Delivered' | 'Cancelled';
  timestamp: number;
  shippingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export const SellerDashboard = () => {
  const { isConnected, address } = useAccount();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegisteredSeller, setIsRegisteredSeller] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [newProduct, setNewProduct] = useState<{ name: string; price: string; stock: string } | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

  const checkSellerRegistration = async () => {
    if (!isConnected || !address) return;

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function registeredSellers(address) view returns (bool)"
        ],
        provider
      );

      const isSeller = await contract.registeredSellers(address);
      setIsRegisteredSeller(isSeller);
      
      if (isSeller) {
        await fetchSellerData();
      }
    } catch (err) {
      console.error("Error checking seller registration:", err);
      setError(err instanceof Error ? err.message : "Failed to check seller registration");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsSeller = async () => {
    try {
      setRegistering(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function registerAsSeller() external"
        ],
        signer
      );

      const tx = await contract.registerAsSeller();
      await tx.wait();

      // Check registration status again
      await checkSellerRegistration();
    } catch (err) {
      console.error("Error registering as seller:", err);
      setError(err instanceof Error ? err.message : "Failed to register as seller");
    } finally {
      setRegistering(false);
    }
  };

  const fetchSellerData = async () => {
    if (!isConnected || !address) {
      console.log("Not connected or no address available");
      return;
    }

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
          "function getAllProducts() external view returns (tuple(uint256 id, address seller, string name, uint256 price, bool available, uint256 stock)[])",
          "function getSellerOrders() external view returns (uint256[])",
          "function getOrderDetails(uint256 orderId) external view returns (uint256 id, address buyer, uint256[] productIds, uint256[] quantities, uint256 totalPaid, uint8 status, uint256 timestamp)",
          "function getShippingInfo(uint256 orderId) external view returns (string memory streetAddress, string memory city, string memory state, string memory zipCode, string memory country, bool hasInfo)",
          "function updateOrderStatus(uint256 orderId, uint8 newStatus) external"
        ],
        provider
      );

      // Fetch products
      console.log("Fetching products...");
      const allProducts = await contract.getAllProducts();
      const sellerProducts = allProducts
        .filter((p: any) => p.seller.toLowerCase() === address.toLowerCase())
        .map((p: any) => ({
          id: Number(p.id),
          name: p.name,
          price: ethers.formatEther(p.price),
          stock: Number(p.stock),
          isActive: p.available
        }))
        .sort((a: Product, b: Product) => b.id - a.id); // Sort by ID in descending order
      console.log("Seller products:", sellerProducts);
      setProducts(sellerProducts);

      // Fetch orders
      console.log("Fetching seller orders...");
      const orderIds = await contract.getSellerOrders();
      console.log("Order IDs:", orderIds);

      const orderPromises = orderIds.map(async (orderId: bigint) => {
        const orderDetails = await contract.getOrderDetails(orderId);
        const shippingInfo = await contract.getShippingInfo(orderId);
        
        // Convert status from enum to string
        const statusMap = ['Pending', 'Accepted', 'Shipped', 'Delivered', 'Cancelled'];
        const status = statusMap[orderDetails.status] as Order['status'];
        
        return {
          id: Number(orderId),
          buyer: orderDetails.buyer,
          productIds: orderDetails.productIds.map((id: bigint) => Number(id)),
          quantities: orderDetails.quantities.map((q: bigint) => Number(q)),
          totalPaid: ethers.formatEther(orderDetails.totalPaid),
          status,
          timestamp: Number(orderDetails.timestamp) * 1000,
          shippingInfo: shippingInfo.hasInfo ? {
            address: shippingInfo.streetAddress,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country
          } : undefined
        };
      });

      const fetchedOrders = await Promise.all(orderPromises);
      console.log("Fetched orders:", fetchedOrders);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Error fetching seller data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch seller data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      checkSellerRegistration();
    }
  }, [isConnected, address]);

  const handleUpdateOrderStatus = async (orderId: number, newStatus: Order['status']) => {
    try {
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function updateOrderStatus(uint256 orderId, uint8 newStatus) external"
        ],
        signer
      );

      // Convert status string to enum value
      const statusMap = ['Pending', 'Accepted', 'Shipped', 'Delivered', 'Cancelled'];
      const statusValue = statusMap.indexOf(newStatus);

      const tx = await contract.updateOrderStatus(orderId, statusValue);
      await tx.wait();

      // Refresh data after status update
      await fetchSellerData();
    } catch (err) {
      console.error("Error updating order status:", err);
      setError(err instanceof Error ? err.message : "Failed to update order status");
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30';
      case 'Accepted': return 'bg-blue-900/30 text-blue-400 border border-blue-500/30';
      case 'Shipped': return 'bg-purple-900/30 text-purple-400 border border-purple-500/30';
      case 'Delivered': return 'bg-green-900/30 text-green-400 border border-green-500/30';
      case 'Cancelled': return 'bg-red-900/30 text-red-400 border border-red-500/30';
      default: return 'bg-gray-900/30 text-gray-400 border border-gray-500/30';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const OrderDetail = ({ order, onClose }: { order: Order; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-[#222] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Orders</span>
          </button>
        </div>

        <div className="space-y-6">
          {/* Order Status Banner */}
          <div className={`p-4 rounded-lg ${
            order.status === 'Pending' ? 'bg-yellow-500/10 border border-yellow-500/20' :
            order.status === 'Accepted' ? 'bg-blue-500/10 border border-blue-500/20' :
            order.status === 'Shipped' ? 'bg-purple-500/10 border border-purple-500/20' :
            order.status === 'Delivered' ? 'bg-green-500/10 border border-green-500/20' :
            'bg-red-500/10 border border-red-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Order #{order.id}</h2>
                <p className="text-sm text-gray-400 mt-1">Placed on {formatDate(order.timestamp)}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
                order.status === 'Shipped' ? 'bg-purple-100 text-purple-800' :
                order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {order.status}
              </span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400">Buyer Address</p>
                  <p className="text-white">{order.buyer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total Amount</p>
                  <p className="text-lg font-medium text-white">{order.totalPaid} ETH</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          {order.shippingInfo && (
            <div className="bg-[#2a2a2a] rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-4">Shipping Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Address</p>
                  <p className="text-white">{order.shippingInfo.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">City</p>
                  <p className="text-white">{order.shippingInfo.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">State</p>
                  <p className="text-white">{order.shippingInfo.state}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">ZIP Code</p>
                  <p className="text-white">{order.shippingInfo.zipCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Country</p>
                  <p className="text-white">{order.shippingInfo.country}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Actions */}
          <div className="flex justify-end gap-3">
            {order.status === 'Pending' && (
              <button
                onClick={() => {
                  handleUpdateOrderStatus(order.id, 'Accepted');
                  onClose();
                }}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accept Order
              </button>
            )}
            {order.status === 'Accepted' && (
              <button
                onClick={() => {
                  handleUpdateOrderStatus(order.id, 'Shipped');
                  onClose();
                }}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Mark as Shipped
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const handleAddProduct = async (product: Omit<Product, 'id' | 'isActive'>) => {
    try {
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function addProduct(string memory name, uint256 price, uint256 stock) external"
        ],
        signer
      );

      const priceInWei = ethers.parseEther(product.price);
      const tx = await contract.addProduct(product.name, priceInWei, product.stock);
      await tx.wait();

      // Close the add product modal
      setShowAddProduct(false);
      
      // Show loading state
      setLoading(true);
      
      // Refresh data after adding product
      await fetchSellerData();
      
      // Switch to products tab
      setActiveTab('products');
    } catch (err) {
      console.error("Error adding product:", err);
      setError(err instanceof Error ? err.message : "Failed to add product");
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      setError(null);
      setUpdatingProductId(updatedProduct.id);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function updateProduct(uint256 productId, string memory name, uint256 price, uint256 stock, bool available) external"
        ],
        signer
      );

      const priceInWei = ethers.parseEther(updatedProduct.price);
      const tx = await contract.updateProduct(
        updatedProduct.id,
        updatedProduct.name,
        priceInWei,
        updatedProduct.stock,
        updatedProduct.isActive
      );
      await tx.wait();

      // Close the edit product modal
      setEditingProduct(null);
      
      // Show loading state
      setLoading(true);
      
      // Refresh data after updating product
      await fetchSellerData();
      
      // Switch to products tab
      setActiveTab('products');
    } catch (err) {
      console.error("Error updating product:", err);
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      setError(null);
      setDeletingProductId(productId);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function updateProduct(uint256 productId, string memory name, uint256 price, uint256 stock, bool available) external"
        ],
        signer
      );

      // Instead of deleting, we'll mark the product as unavailable
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const priceInWei = ethers.parseEther(product.price);
      const tx = await contract.updateProduct(
        productId,
        product.name,
        priceInWei,
        product.stock,
        false // Set available to false
      );
      await tx.wait();

      // Show loading state
      setLoading(true);
      
      // Refresh data after "deleting" product
      await fetchSellerData();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setDeletingProductId(null);
    }
  };

  if (!isRegisteredSeller) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-[#222] rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Become a Seller</h2>
          <p className="text-gray-400 mb-6">
            Register as a seller to start listing your products and managing orders.
          </p>
          <button
            onClick={handleRegisterAsSeller}
            disabled={registering}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {registering ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Registering...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Register as Seller
              </>
            )}
          </button>
          {error && (
            <div className="mt-4 bg-red-900/30 text-red-400 border border-red-500/30 rounded-lg p-4">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#333]">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'products'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'orders'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Orders
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Products Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">My Products</h2>
            <button 
              onClick={() => setShowAddProduct(true)}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Product
            </button>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-[#222] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">#{product.id}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-white mt-1">{product.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingProduct(product)}
                      disabled={updatingProductId === product.id || deletingProductId === product.id}
                      className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingProductId === product.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={updatingProductId === product.id || deletingProductId === product.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingProductId === product.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-500"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-gray-400">
                    Price: <span className="text-white">{product.price} ETH</span>
                  </div>
                  <div className="text-gray-400">
                    Stock: <span className="text-white">{product.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Orders Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">My Orders</h2>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="bg-[#222] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-gray-400">Order #{order.id}</span>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Product: <span className="text-white">
                        {products.find(p => p.id === order.productIds[0])?.name || 'Unknown Product'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400">
                      Total: <span className="text-white">{order.totalPaid} ETH</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(order.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <AddProduct
          onClose={() => {
            setShowAddProduct(false);
            fetchSellerData(); // Fetch products when modal is closed
          }}
          onProductAdded={() => {
            if (newProduct) {
              handleAddProduct({
                name: newProduct.name,
                price: newProduct.price,
                stock: parseInt(newProduct.stock)
              });
            }
          }}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProduct
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdate={handleUpdateProduct}
          isUpdating={updatingProductId === editingProduct.id}
        />
      )}
    </div>
  );
}; 