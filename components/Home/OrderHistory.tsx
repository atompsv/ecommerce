import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';

const CONTRACT_ADDRESS = "0xefbE9638c138417F1c1406DcF87913a060e3eB8a";

interface Order {
  id: number;
  products: {
    name: string;
    quantity: number;
    price: string;
    seller: string;
  }[];
  totalPrice: string;
  timestamp: number;
  status: 'completed' | 'processing' | 'cancelled';
  seller: string;
  hasShippingInfo?: boolean;
  shippingInfo?: ShippingFormData;
}

interface ShippingFormData {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface ShippingFormProps {
  onClose: () => void;
  onSubmit: (data: ShippingFormData) => void;
  isSubmitting: boolean;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const ShippingForm: React.FC<ShippingFormProps> = ({ onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<ShippingFormData>({
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 mt-2">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Add Shipping Information</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              id="streetAddress"
              name="streetAddress"
              type="text"
              value={formData.streetAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, streetAddress: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="street-address"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="address-level2"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              id="state"
              name="state"
              type="text"
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="address-level1"
            />
          </div>

          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              id="zipCode"
              name="zipCode"
              type="text"
              value={formData.zipCode}
              onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="postal-code"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              id="country"
              name="country"
              type="text"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="country"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-tr from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Submitting...
                </div>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Update formatDateTime function
const formatDateTime = (timestamp: number) => {
  if (!timestamp) return 'Invalid Date';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const OrderHistory = () => {
  const { isConnected, address } = useAccount();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [shippingFormData, setShippingFormData] = useState<ShippingFormData>({
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [submittingShipping, setSubmittingShipping] = useState(false);

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
        // Extract the error message from the revert
        const revertMessage = error.message.split('"')[1] || "Unknown reason";
        message = revertMessage;
      }
    }

    addToast('error', message);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `0x${address.slice(2, 4)}...${address.slice(-4)}`;
  };

  const handleShippingInputChange = useCallback((field: keyof ShippingFormData, value: string) => {
    setShippingFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleAddShippingInfo = async (orderId: number, formData: ShippingFormData) => {
    try {
      setSubmittingShipping(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this feature");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function addShippingInfoToOrder(uint256 orderId, string memory shippingStreetAddress, string memory city, string memory state, string memory zipCode, string memory country) external"
        ],
        signer
      );

      const tx = await contract.addShippingInfoToOrder(
        orderId,
        formData.streetAddress,
        formData.city,
        formData.state,
        formData.zipCode,
        formData.country
      );
      await tx.wait();

      // Close the form and refresh orders
      setShowShippingForm(false);
      
      // Update the selected order with fresh data
      const updatedOrders = await fetchOrders();
      const updatedOrder = updatedOrders.find((order: Order) => order.id === orderId);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }

      // Show success notification
      addToast('success', 'Shipping information added successfully!');

    } catch (err) {
      handleError(err);
    } finally {
      setSubmittingShipping(false);
    }
  };

  const fetchOrders = async () => {
    if (!isConnected || !address) {
      console.log("Not connected or no address available");
      return [];
    }

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
        [
          "function debugGetAllBuyerOrders(address) external view returns (uint256[])",
          "function getOrderDetails(uint256 orderId) external view returns (uint256 id, address buyer, uint256[] productIds, uint256[] quantities, uint256 totalPaid, uint8 status, uint256 timestamp)",
          "function getProductDetails(uint256 productId) external view returns (uint256 id, address seller, string memory name, uint256 price, bool available, uint256 stock)",
          "function getShippingInfo(uint256 orderId) external view returns (string memory streetAddress, string memory city, string memory state, string memory zipCode, string memory country, bool hasInfo)"
        ],
        signer
      );

      console.log("=== Debug Info ===");
      console.log("Connected address:", address);
      console.log("Contract address:", CONTRACT_ADDRESS);
      
      const orderIds = await contract.debugGetAllBuyerOrders(address);
      console.log("Raw order IDs:", orderIds);

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

        try {
          // Get order details
          const orderDetails = await contract.getOrderDetails(orderId);
          console.log("Order details:", orderDetails);

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

          // Get all products in the order
          const orderProducts = [];
          for (let i = 0; i < orderDetails.productIds.length; i++) {
            const productId = Number(orderDetails.productIds[i]);
            const quantity = Number(orderDetails.quantities[i]);
            const productDetails = await contract.getProductDetails(productId);
            
            orderProducts.push({
              name: productDetails.name,
              quantity: quantity,
              price: ethers.formatEther(productDetails.price),
              seller: productDetails.seller
            });
          }

          // Convert status from enum to string
          const statusMap = ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'];
          const status = statusMap[Number(orderDetails.status)] as Order['status'];

          // Validate status
          if (!status) {
            console.log(`Skipping order ${orderId}: Invalid status`);
            continue;
          }

          // Convert timestamp to milliseconds and ensure it's a valid number
          const timestamp = Number(orderDetails.timestamp) * 1000;
          console.log("Order timestamp:", timestamp, "Original:", orderDetails.timestamp);

          // Convert totalPaid from wei to MON
          const totalPrice = ethers.formatEther(orderDetails.totalPaid);

          const shippingInfo = await contract.getShippingInfo(orderId);

          const order = {
            id: orderId,
            products: orderProducts,
            totalPrice,
            timestamp,
            status,
            seller: orderProducts[0].seller,
            hasShippingInfo: shippingInfo.hasInfo,
            shippingInfo: shippingInfo.hasInfo ? {
              streetAddress: shippingInfo.streetAddress,
              city: shippingInfo.city,
              state: shippingInfo.state,
              zipCode: shippingInfo.zipCode,
              country: shippingInfo.country
            } : undefined
          };

          console.log("Processed order:", order);
          fetchedOrders.push(order);
        } catch (err) {
          console.error(`Error processing order ${orderId}:`, err);
          continue;
        }
      }

      console.log("\n=== Final Results ===");
      console.log(`Processed ${fetchedOrders.length} valid orders out of ${orderIdsArray.length} total orders`);
      
      if (fetchedOrders.length === 0) {
        console.log("No valid orders found after processing");
        setOrders([]);
      } else {
        const sortedOrders = fetchedOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setOrders(sortedOrders);
      }
      
      return fetchedOrders;
    } catch (err) {
      console.error("Error in fetchOrders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchOrders();
    }
  }, [isConnected, address]);

  // Order List View
  const OrderListView = () => (
    <div className="w-full space-y-4 mt-4">
      {/* Header */}
      <div className="flex justify-between items-center px-5">
        <h2 className="text-xl font-bold text-gray-900">Order History</h2>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 text-red-700 border border-red-400 rounded-lg p-4 mx-5">
          {error}
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-2 px-5">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer w-full shadow-sm"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex flex-col gap-3">
              {/* Top Row: Order ID and Status */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">#{order.id}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  {order.hasShippingInfo ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                      Shipping Info Added
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 whitespace-nowrap">
                      Shipping Info Pending
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(order.timestamp)}</span>
              </div>

              {/* Middle Row: Product Names and Price */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-500">
                    {order.products.map((product, index) => (
                      <span key={index}>
                        {product.name}
                        {index < order.products.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-500">
                    {order.products.length} {order.products.length === 1 ? 'item' : 'items'}
                  </div>
                  <div className="text-xs text-gray-500">Total: {order.totalPrice} MON</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center mx-5 shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No orders found</p>
        </div>
      )}
    </div>
  );

  // Order Details View
  const OrderDetailsView = () => {
    if (!selectedOrder) return null;

    const status = selectedOrder.status;
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <div className="w-full space-y-4 px-5">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => setSelectedOrder(null)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
        </div>

        {/* Order Content */}
        <div className="bg-white rounded-lg p-6 space-y-6 shadow-sm">
          {/* Order Status Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"> 
              <span className="text-sm text-gray-500">#{selectedOrder.id}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {formattedStatus}
              </span>
              {selectedOrder.hasShippingInfo ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  Shipping Added
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                  Shipping Pending
                </span>
              )}
            </div>
          </div>
        
          {/* Product Info Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Products</h3>
            <div className="space-y-4">
              {selectedOrder.products.map((product, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="text-base font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">Quantity: {product.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-500">{product.price} MON</div>
                    <div className="text-xs text-gray-500">per unit</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Seller</span>
                <span className="text-gray-900">{formatAddress(selectedOrder.seller)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-500">Placed on</span>
                <span className="text-gray-900">{formatDateTime(selectedOrder.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Order Details Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Items</span>
              <span className="text-gray-900 font-medium">
                {selectedOrder.products.reduce((sum, p) => sum + p.quantity, 0)}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-gray-700">Total Amount</span>
              <span className="text-xl font-bold text-blue-500">{selectedOrder.totalPrice} MON</span>
            </div>
          </div>

          {/* Shipping Info Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-medium text-gray-900">Shipping Information</h4>
              {!selectedOrder.hasShippingInfo && (
                <button
                  onClick={() => setShowShippingForm(true)}
                  className="px-4 py-2 bg-gradient-to-tr from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all transform hover:scale-[1.02] text-sm font-medium"
                >
                  Add Shipping
                </button>
              )}
            </div>
            {selectedOrder.hasShippingInfo ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Street Address</span>
                  <span className="text-gray-900">{selectedOrder.shippingInfo?.streetAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">City</span>
                  <span className="text-gray-900">{selectedOrder.shippingInfo?.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">State</span>
                  <span className="text-gray-900">{selectedOrder.shippingInfo?.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ZIP Code</span>
                  <span className="text-gray-900">{selectedOrder.shippingInfo?.zipCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Country</span>
                  <span className="text-gray-900">{selectedOrder.shippingInfo?.country}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No shipping information added yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add Toast component
  const ToastNotifications = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${
            toast.type === 'success' 
              ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
              : 'bg-red-900/30 text-red-400 border border-red-500/30'
          } px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out flex items-center justify-between gap-2`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {selectedOrder ? <OrderDetailsView /> : <OrderListView />}
      {showShippingForm && selectedOrder && (
        <ShippingForm
          onClose={() => setShowShippingForm(false)}
          onSubmit={(formData) => handleAddShippingInfo(selectedOrder.id, formData)}
          isSubmitting={submittingShipping}
        />
      )}
      <ToastNotifications />
    </>
  );
}; 