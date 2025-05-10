import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';

const CONTRACT_ADDRESS = "0xefbE9638c138417F1c1406DcF87913a060e3eB8a";

interface Order {
  id: number;
  productName: string;
  quantity: number;
  totalPrice: string;
  date: string;
  status: 'completed' | 'processing' | 'cancelled';
  seller: string;
  hasShippingInfo?: boolean;
}

interface ShippingFormData {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export const OrderHistory = () => {
  const { isConnected, address } = useAccount();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingFormData, setShippingFormData] = useState<ShippingFormData>({
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [submittingShipping, setSubmittingShipping] = useState(false);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/30 text-green-400 border border-green-500/30';
      case 'processing':
        return 'bg-blue-900/30 text-blue-400 border border-blue-500/30';
      case 'cancelled':
        return 'bg-red-900/30 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-900/30 text-gray-400 border border-gray-500/30';
    }
  };

  const handleShippingInputChange = useCallback((field: keyof ShippingFormData, value: string) => {
    setShippingFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleAddShippingInfo = async (orderId: number) => {
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
        shippingFormData.streetAddress,
        shippingFormData.city,
        shippingFormData.state,
        shippingFormData.zipCode,
        shippingFormData.country
      );
      await tx.wait();

      // Close the form and refresh orders
      setShowShippingForm(false);
      setShippingFormData({
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      });
      await fetchOrders();
    } catch (err) {
      console.error("Error adding shipping info:", err);
      setError(err instanceof Error ? err.message : "Failed to add shipping information");
    } finally {
      setSubmittingShipping(false);
    }
  };

  const fetchOrders = async () => {
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
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function debugGetAllBuyerOrders(address) external view returns (uint256[])",
          "function getBuyerOrders() external view returns (uint256[])",
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

      // Convert BigInt array to number array
      const orderIdsArray = orderIds.map((id: bigint) => Number(id));
      console.log("Converted order IDs:", orderIdsArray);

      // Fetch details for each order
      const orderPromises = orderIdsArray.map(async (orderId: number) => {
        console.log(`\n=== Fetching Order ${orderId} ===`);
        
        let orderDetails;
        try {
          console.log("Calling getOrderDetails...");
          orderDetails = await contract.getOrderDetails(orderId);
          console.log("Raw order details:", orderDetails);
        } catch (err) {
          console.error(`Error fetching details for order ${orderId}:`, err);
          return null;
        }
        
        // Get shipping info
        let shippingInfo;
        try {
          shippingInfo = await contract.getShippingInfo(orderId);
          console.log("Shipping info:", shippingInfo);
        } catch (err) {
          console.error(`Error fetching shipping info for order ${orderId}:`, err);
          shippingInfo = { hasInfo: false };
        }
        
        // Get the first product ID from the array
        const productId = Number(orderDetails.productIds[0]);
        console.log("Product ID:", productId);
        
        let productDetails;
        try {
          console.log("Calling getProductDetails...");
          productDetails = await contract.getProductDetails(productId);
          console.log("Raw product details:", productDetails);
        } catch (err) {
          console.error(`Error fetching product details for ID ${productId}:`, err);
          return null;
        }
        
        // Convert status from enum to string
        const statusMap = ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'];
        const status = statusMap[Number(orderDetails.status)] as Order['status'];
        
        // Convert timestamp to date string
        const date = new Date(Number(orderDetails.timestamp) * 1000).toISOString().split('T')[0];
        
        // Convert totalPaid from wei to ETH
        const totalPrice = ethers.formatEther(orderDetails.totalPaid);
        
        const order = {
          id: orderId,
          productName: productDetails.name,
          quantity: Number(orderDetails.quantities[0]),
          totalPrice,
          date,
          status,
          seller: productDetails.seller,
          hasShippingInfo: shippingInfo.hasInfo
        };
        
        console.log("Processed order:", order);
        return order;
      });

      const fetchedOrders = (await Promise.all(orderPromises)).filter(order => order !== null);
      console.log("\n=== Final Results ===");
      console.log("All fetched orders:", fetchedOrders);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Order History</h2>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 text-red-400 border border-red-500/30 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-[#222] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors cursor-pointer w-full"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-start justify-between h-[5.5rem]">
              <div className="flex-1 min-w-0 pr-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-400">#{order.id}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {order.hasShippingInfo && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                        Shipping Added
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-white truncate">{order.productName}</h3>
                </div>
                <div className="text-xs text-gray-400">
                  {order.date}
                </div>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col justify-between h-full">
                <div className="text-sm font-medium text-white">{order.totalPrice} ETH</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-[#222] rounded-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">No orders found</p>
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
      <div className="w-full space-y-4">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedOrder(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-white">Order Details</h2>
        </div>

        {/* Order Content */}
        <div className="bg-[#222] rounded-lg p-6">
          <div className="space-y-6">
            {/* Order ID and Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">#{selectedOrder.id}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {formattedStatus}
              </span>
              {selectedOrder.hasShippingInfo && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                  Shipping Added
                </span>
              )}
            </div>
        
            {/* Product Info */}
            <div>
              <h3 className="text-lg font-medium text-white">{selectedOrder.productName}</h3>
              <p className="text-sm text-gray-400 mt-1">Ordered on {selectedOrder.date}</p>
            </div>

            {/* Order Details */}
            <div className="pt-4 border-t border-[#333] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Quantity:</span>
                <span className="text-white">{selectedOrder.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price per unit:</span>
                <span className="text-white">
                  {(parseFloat(selectedOrder.totalPrice) / selectedOrder.quantity).toFixed(4)} ETH
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Seller:</span>
                <span className="text-white">{selectedOrder.seller}</span>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-[#333] flex justify-between items-center">
              <span className="text-base text-gray-300">Total:</span>
              <span className="text-xl font-bold text-white">{selectedOrder.totalPrice} ETH</span>
            </div>

            {/* Add Shipping Info Button */}
            {!selectedOrder.hasShippingInfo && (
              <div className="pt-4 border-t border-[#333]">
                <button
                  onClick={() => setShowShippingForm(true)}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Add Shipping Information
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Shipping Form Modal
  const ShippingForm = () => {
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      handleShippingInputChange(name as keyof ShippingFormData, value);
    }, [handleShippingInputChange]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-[#222] rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">Add Shipping Information</h3>
            <button
              onClick={() => setShowShippingForm(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedOrder) {
              handleAddShippingInfo(selectedOrder.id);
            }
          }} className="space-y-4" autoComplete="on">
            <div>
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-400 mb-1">
                Street Address
              </label>
              <input
                id="streetAddress"
                name="streetAddress"
                type="text"
                value={shippingFormData.streetAddress}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="street-address"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-400 mb-1">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={shippingFormData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="address-level2"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-400 mb-1">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                value={shippingFormData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="address-level1"
              />
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-400 mb-1">
                ZIP Code
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                value={shippingFormData.zipCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="postal-code"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-400 mb-1">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={shippingFormData.country}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="country"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowShippingForm(false);
                  setShippingFormData({
                    streetAddress: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: ''
                  });
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingShipping}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingShipping ? (
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

  return (
    <>
      {selectedOrder ? <OrderDetailsView /> : <OrderListView />}
      {showShippingForm && <ShippingForm />}
    </>
  );
}; 