import React, { useState } from 'react';

interface Order {
  id: number;
  productName: string;
  quantity: number;
  totalPrice: string;
  date: string;
  status: 'completed' | 'processing' | 'cancelled';
  seller: string;
}

// Mock data for development
const mockOrders: Order[] = [
  {
    id: 1,
    productName: "Premium Digital Art NFT Collection",
    quantity: 2,
    totalPrice: "0.2",
    date: "2024-03-20",
    status: "completed",
    seller: "0x123...abc"
  },
  {
    id: 2,
    productName: "Rare Crypto Collectible",
    quantity: 1,
    totalPrice: "0.05",
    date: "2024-03-19",
    status: "processing",
    seller: "0x456...def"
  },
  {
    id: 3,
    productName: "Limited Edition Trading Card",
    quantity: 3,
    totalPrice: "0.6",
    date: "2024-03-18",
    status: "cancelled",
    seller: "0x789...ghi"
  }
];

export const OrderHistory = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  // Order List View
  const OrderListView = () => (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Order History</h2>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {mockOrders.map((order) => (
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
      {mockOrders.length === 0 && (
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