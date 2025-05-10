import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import SimpleEcommerce from '../../artifacts/contracts/SimpleEcommerce.sol/SimpleEcommerce.json';

const CONTRACT_ADDRESS = "0x6408b1A5234b0c18727001ab5931FDf511D56ADb";

interface Order {
  id: number;
  productName: string;
  quantity: number;
  totalPrice: string;
  date: string;
  status: 'completed' | 'processing' | 'cancelled';
  seller: string;
}

export const OrderHistory = () => {
  const { isConnected, address } = useAccount();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function getBuyerOrders() external view returns (uint256[])",
          "function getOrderDetails(uint256 orderId) external view returns (uint256 id, address buyer, uint256[] productIds, uint256[] quantities, uint256 totalPaid, uint8 status, uint256 timestamp)",
          "function getProductDetails(uint256 productId) external view returns (uint256 id, address seller, string memory name, uint256 price, bool available, uint256 stock)"
        ],
        provider
      );

      console.log("Fetching orders for address:", address);
      
      // Get all order IDs for the current user
      const orderIds = await contract.getBuyerOrders();
      console.log("Raw order IDs:", orderIds);

      if (!orderIds || orderIds.length === 0) {
        console.log("No orders found for this address");
        setOrders([]);
        return;
      }

      // Fetch details for each order
      const orderPromises = orderIds.map(async (orderId: bigint) => {
        console.log("Fetching details for order ID:", orderId.toString());
        
        const orderDetails = await contract.getOrderDetails(orderId);
        console.log("Order details:", orderDetails);
        
        const productDetails = await contract.getProductDetails(orderDetails.productIds[0]);
        console.log("Product details:", productDetails);
        
        // Convert status from enum to string
        const statusMap = ['pending', 'processing', 'processing', 'completed', 'cancelled'];
        const status = statusMap[orderDetails.status] as Order['status'];
        
        // Convert timestamp to date string
        const date = new Date(Number(orderDetails.timestamp) * 1000).toISOString().split('T')[0];
        
        // Convert totalPaid from wei to ETH
        const totalPrice = ethers.formatEther(orderDetails.totalPaid);
        
        const order = {
          id: Number(orderId),
          productName: productDetails.name,
          quantity: Number(orderDetails.quantities[0]),
          totalPrice,
          date,
          status,
          seller: productDetails.seller
        };
        
        console.log("Processed order:", order);
        return order;
      });

      const fetchedOrders = await Promise.all(orderPromises);
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
          </div>
        </div>
      </div>
    );
  };

  return selectedOrder ? <OrderDetailsView /> : <OrderListView />;
}; 