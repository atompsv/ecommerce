import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';
import { AddProduct } from './AddProduct';
import { EditProduct } from './EditProduct';

const CONTRACT_ADDRESS = "0xefbE9638c138417F1c1406DcF87913a060e3eB8a";

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
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isOrdersDataReady, setIsOrdersDataReady] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isProductsDataReady, setIsProductsDataReady] = useState(false);
  const [hasAttemptedOrdersFetch, setHasAttemptedOrdersFetch] = useState(false);

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
        await fetchProducts();
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

  const fetchProducts = async (retryCount = 0) => {
    if (!isConnected || !address) {
      console.log("Not connected or no address available");
      return;
    }

    try {
      setIsLoadingProducts(true);
      setError(null);
      setIsProductsDataReady(false);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function getAllProducts() external view returns (tuple(uint256 id, address seller, string name, uint256 price, bool available, uint256 stock)[])"
        ],
        signer
      );

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
        .sort((a: Product, b: Product) => b.id - a.id);
      console.log("Seller products:", sellerProducts);
      setProducts(sellerProducts);
      setIsProductsDataReady(true);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch products");
      
      if (retryCount < 3) {
        console.log(`Retrying product fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchProducts(retryCount + 1), 1000 * (retryCount + 1));
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchOrders = async () => {
    if (!isConnected || !address) {
      console.log("Not connected or no address available");
      return;
    }

    try {
      setIsLoadingOrders(true);
      setError(null);
      setIsOrdersDataReady(false);
      setHasAttemptedOrdersFetch(false);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Log network info
      const network = await provider.getNetwork();
      console.log("Current network:", network);

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function debugGetAllSellerOrders(address) external view returns (uint256[])",
          "function getOrderDetails(uint256 orderId) external view returns (uint256 id, address buyer, uint256[] productIds, uint256[] quantities, uint256 totalPaid, uint8 status, uint256 timestamp)"
        ],
        signer
      );

      console.log("=== Debug Info ===");
      console.log("Connected address:", address);
      console.log("Contract address:", CONTRACT_ADDRESS);
      
      // Get order IDs
      const orderIds = await contract.debugGetAllSellerOrders(address);
      console.log("Raw order IDs:", orderIds);

      setHasAttemptedOrdersFetch(true);

      if (!orderIds || orderIds.length === 0) {
        console.log("No orders found");
        setOrders([]);
        setIsOrdersDataReady(true);
        return;
      }

      // Convert BigInt array to number array and sort in descending order
      const orderIdsArray = orderIds
        .map((id: bigint) => Number(id))
        .filter((id: number) => id > 0) // Ensure we only process valid order IDs (greater than 0)
        .sort((a: number, b: number) => b - a);
      console.log("Converted and sorted order IDs:", orderIdsArray);

      // Process orders one by one
      const fetchedOrders: Order[] = [];
      
      for (const orderId of orderIdsArray) {
        console.log(`\n=== Fetching Order ${orderId} ===`);
        
        // Add a small delay between requests to avoid rate limiting
        if (fetchedOrders.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const orderDetails = await contract.getOrderDetails(orderId);
        
        // Validate order details
        if (!orderDetails || !orderDetails.buyer || !orderDetails.productIds || !orderDetails.quantities) {
          console.log(`Skipping invalid order ${orderId}: Missing required data`);
          continue;
        }

        // Validate order ID matches
        if (Number(orderDetails.id) !== orderId) {
          console.log(`Skipping order ${orderId}: ID mismatch`);
          continue;
        }

        const statusMap = ['Pending', 'Accepted', 'Shipped', 'Delivered', 'Cancelled'];
        const status = statusMap[Number(orderDetails.status)] as Order['status'];

        // Validate status
        if (!status) {
          console.log(`Skipping order ${orderId}: Invalid status`);
          continue;
        }

        fetchedOrders.push({
          id: orderId,
          buyer: orderDetails.buyer,
          productIds: orderDetails.productIds.map((id: bigint) => Number(id)),
          quantities: orderDetails.quantities.map((q: bigint) => Number(q)),
          totalPaid: ethers.formatEther(orderDetails.totalPaid),
          status,
          timestamp: Number(orderDetails.timestamp) * 1000,
          shippingInfo: undefined
        });

        console.log(`Successfully processed order ${orderId}`);
      }

      console.log("\n=== Final Results ===");
      console.log(`Processed ${fetchedOrders.length} valid orders out of ${orderIdsArray.length} total orders`);
      
      if (fetchedOrders.length === 0) {
        console.log("No valid orders found after processing");
        setOrders([]);
      } else {
        const sortedOrders = fetchedOrders.sort((a, b) => b.timestamp - a.timestamp);
        setOrders(sortedOrders);
      }
      
      setIsOrdersDataReady(true);
    } catch (err) {
      console.error("Error in fetchOrders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
      setHasAttemptedOrdersFetch(true);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Update initialization effect to only check registration
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (isConnected && address) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await provider.ready;
          
          if (mounted) {
            await checkSellerRegistration();
          }
        } catch (err) {
          console.error("Error during initialization:", err);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [isConnected, address]);

  // Add effect to fetch data based on active tab
  useEffect(() => {
    if (isRegisteredSeller) {
      if (activeTab === 'products') {
        fetchProducts();
      } else if (activeTab === 'orders') {
        fetchOrders();
      }
    }
  }, [activeTab, isRegisteredSeller]);

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

      // Wait for provider to be ready
      await provider.ready;

      // Get the current network
      const network = await provider.getNetwork();
      console.log("Current network:", network);

      // Get the current gas price
      const gasPrice = await provider.getFeeData();
      console.log("Current gas price:", gasPrice);

      // Estimate gas for the transaction
      const gasEstimate = await contract.updateOrderStatus.estimateGas(orderId, statusValue);
      console.log("Estimated gas:", gasEstimate);

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * BigInt(12) / BigInt(10);

      // Send transaction with explicit gas limit
      const tx = await contract.updateOrderStatus(orderId, statusValue, {
        gasLimit: gasLimit
      });

      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      // Refresh data after status update
      await fetchOrders();
      return true;
    } catch (err) {
      console.error("Error updating order status:", err);
      
      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message.includes("user rejected")) {
          throw new Error("Transaction was rejected. Please try again.");
        } else if (err.message.includes("insufficient funds")) {
          throw new Error("Insufficient funds for gas. Please add more funds to your wallet.");
        } else if (err.message.includes("nonce")) {
          throw new Error("Transaction failed. Please try again.");
        } else if (err.message.includes("already been mined")) {
          throw new Error("Order status has already been updated.");
        }
      }
      
      throw new Error(err instanceof Error ? err.message : "Failed to update order status");
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'Accepted': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Shipped': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Delivered': return 'bg-green-100 text-green-700 border border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const OrderDetail = ({ order, onClose }: { order: Order; onClose: () => void }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isLoadingShippingInfo, setIsLoadingShippingInfo] = useState(false);
    const [orderWithShipping, setOrderWithShipping] = useState<Order>(order);

    // Fetch shipping info when order detail is opened
    useEffect(() => {
      const fetchShippingInfo = async () => {
        if (!window.ethereum) return;

        try {
          setIsLoadingShippingInfo(true);
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            [
              "function getShippingInfo(uint256 orderId) external view returns (string memory streetAddress, string memory city, string memory state, string memory zipCode, string memory country, bool hasInfo)"
            ],
            signer
          );

          const shippingInfo = await contract.getShippingInfo(order.id);
          console.log("Shipping info:", shippingInfo);

          if (shippingInfo.hasInfo) {
            setOrderWithShipping({
              ...order,
              shippingInfo: {
                address: shippingInfo.streetAddress,
                city: shippingInfo.city,
                state: shippingInfo.state,
                zipCode: shippingInfo.zipCode,
                country: shippingInfo.country
              }
            });
          }
        } catch (err) {
          console.error("Error fetching shipping info:", err);
        } finally {
          setIsLoadingShippingInfo(false);
        }
      };

      fetchShippingInfo();
    }, [order.id]);

    // Format buyer address to show only first 6 and last 4 characters
    const formatAddress = (address: string) => {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleStatusUpdate = async (newStatus: Order['status']) => {
      try {
        setIsUpdating(true);
        setToast(null); // Clear any existing toast

        const success = await handleUpdateOrderStatus(order.id, newStatus);
        
        if (success) {
          // Show success message
          setToast({
            message: `Order successfully ${newStatus.toLowerCase()}`,
            type: 'success'
          });
          // Close modal after a short delay
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } catch (err) {
        console.error("Error in handleStatusUpdate:", err);
        // Show error message
        setToast({
          message: err instanceof Error ? err.message : "Failed to update order status",
          type: 'error'
        });
      } finally {
        setIsUpdating(false);
      }
    };

    // Auto-hide toast after 5 seconds
    useEffect(() => {
      if (toast) {
        const timer = setTimeout(() => {
          setToast(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }, [toast]);

    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto shadow-lg">
          {/* Toast Notification */}
          {toast && (
            <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
              toast.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
          )}

        {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-6 mt-6">
          <button
            onClick={onClose}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
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
              order.status === 'Pending' ? 'bg-yellow-50 border border-yellow-200' :
              order.status === 'Accepted' ? 'bg-blue-50 border border-blue-200' :
              order.status === 'Shipped' ? 'bg-purple-50 border border-purple-200' :
              order.status === 'Delivered' ? 'bg-green-50 border border-green-200' :
              'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                  <h2 className="text-xl font-bold text-gray-900">Order #{order.id}</h2>
                  <p className="text-sm text-gray-500 mt-1">Placed on {formatDate(order.timestamp)}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  order.status === 'Accepted' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  order.status === 'Shipped' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                  order.status === 'Delivered' ? 'bg-green-100 text-green-800 border border-green-200' :
                  'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {order.status}
              </span>
            </div>
          </div>

          {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Order Summary</h3>
              
              {/* Products List */}
              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Products</p>
                {order.productIds.map((productId, index) => (
                  <div key={productId} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                <div>
                        <p className="text-gray-900 font-medium">
                          {products.find(p => p.id === productId)?.name || 'Unknown Product'}
                        </p>
                        <p className="text-sm text-gray-500">Quantity: {order.quantities[index]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-medium">
                        {(parseFloat(order.totalPaid) / order.quantities[index]).toFixed(4)} MON
                      </p>
                      <p className="text-sm text-gray-500">per unit</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Amount */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold text-blue-500">{order.totalPaid} MON</p>
                </div>
              </div>

              {/* Buyer Address */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Buyer Address</p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(order.buyer)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                    title="Copy address"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-900 font-mono text-sm break-all">{order.buyer}</p>
            </div>
          </div>

          {/* Shipping Information */}
            {isLoadingShippingInfo ? (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="text-gray-500">Loading shipping information...</p>
                </div>
              </div>
            ) : orderWithShipping.shippingInfo ? (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Shipping Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Street Address</p>
                    <p className="text-gray-900">{orderWithShipping.shippingInfo.address}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">City</p>
                    <p className="text-gray-900">{orderWithShipping.shippingInfo.city}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">State</p>
                    <p className="text-gray-900">{orderWithShipping.shippingInfo.state}</p>
                </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">ZIP Code</p>
                    <p className="text-gray-900">{orderWithShipping.shippingInfo.zipCode}</p>
                </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Country</p>
                    <p className="text-gray-900">{orderWithShipping.shippingInfo.country}</p>
                </div>
                </div>
              </div>
            ) : null}

          {/* Order Actions */}
          <div className="flex justify-end gap-3">
            {order.status === 'Pending' && (
              <button
                  onClick={() => handleStatusUpdate('Accepted')}
                  disabled={isUpdating || !orderWithShipping.shippingInfo}
                  className="px-6 py-2 bg-gradient-to-tr from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all transform hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Accepting...
                    </>
                  ) : (
                    <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accept Order
                    </>
                  )}
              </button>
            )}
            {order.status === 'Accepted' && (
              <button
                  onClick={() => handleStatusUpdate('Shipped')}
                  disabled={isUpdating}
                  className="px-6 py-2 bg-gradient-to-tr from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all transform hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Mark as Shipped
                    </>
                  )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  };

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
      await fetchProducts();
      
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
      await fetchProducts();
      
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
      await fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleOrdersTabClick = () => {
    setActiveTab('orders');
    fetchOrders();
  };

  if (!isRegisteredSeller) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Become a Seller</h2>
          <p className="text-gray-500 mb-6">
            Register as a seller to start listing your products and managing orders.
          </p>
          <button
            onClick={handleRegisterAsSeller}
            disabled={registering}
            className="px-6 py-3 bg-gradient-to-tr from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all transform hover:scale-[1.02] flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="mt-4 bg-red-100 text-red-700 border border-red-400 rounded-lg p-4">
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
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'products'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Products
        </button>
        <button
          onClick={handleOrdersTabClick}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'orders'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Orders {isLoadingOrders && (
            <span className="ml-2 inline-block">
              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-500"></div>
            </span>
          )}
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Products Header */}
          <div className="flex justify-between items-center ml-3 mr-3">
            <h2 className="text-xl font-bold text-gray-900">My Products</h2>
            <button 
              onClick={() => setShowAddProduct(true)}
              className="px-3 py-1.5 bg-gradient-to-tr from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all transform hover:scale-[1.02] flex items-center gap-1.5 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Product
            </button>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-3 mr-3">
            {!isProductsDataReady ? (
              <div className="col-span-full bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
                        <span className="text-sm text-gray-500">#{product.id}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.isActive 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mt-1">{product.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingProduct(product)}
                      disabled={updatingProductId === product.id || deletingProductId === product.id}
                      className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingProductId === product.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                      ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      )}
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={updatingProductId === product.id || deletingProductId === product.id}
                      className="p-1.5 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="text-gray-500">
                    Price: <span className="text-blue-500">{product.price} MON</span>
                  </div>
                  <div className="text-gray-500">
                    Stock: <span className="text-gray-900">{product.stock}</span>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* Orders Header */}
          <div className="flex justify-between items-center px-5">
            <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
          </div>

          {/* Orders List */}
          <div className="space-y-2 px-5">
            {!hasAttemptedOrdersFetch || isLoadingOrders ? (
              <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading orders...</p>
              </div>
            ) : !isOrdersDataReady ? (
              <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Processing orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-500">No orders found</p>
              </div>
            ) : (
              orders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer w-full shadow-sm"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-col gap-3">
                  {/* Order ID and Status */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">#{order.id}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(order.timestamp)}
                    </div>
                  </div>

                  {/* Product and Total */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">
                        {order.productIds.map((productId, index) => (
                          <span key={productId}>
                            {products.find(p => p.id === productId)?.name || 'Unknown Product'}
                            {index < order.productIds.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-500">
                        {order.productIds.length} {order.productIds.length === 1 ? 'item' : 'items'}
                      </div>
                      <div className="text-xs text-gray-500">Total: {order.totalPaid} MON</div>
                    </div>
                  </div>
                </div>
              </div>
              ))
            )}
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
            fetchProducts(); // Fetch products when modal is closed
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