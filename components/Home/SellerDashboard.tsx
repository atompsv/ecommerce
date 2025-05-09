import React, { useState } from 'react';
import { AddProduct } from './AddProduct';
import { EditProduct } from './EditProduct';

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
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "Premium Digital Art",
      price: "0.1",
      stock: 10,
      isActive: true,
    },
    {
      id: 2,
      name: "Rare Crypto Collectible",
      price: "0.05",
      stock: 15,
      isActive: true,
    }
  ]);

  const [orders, setOrders] = useState<Order[]>([
    {
      id: 1,
      buyer: "0x123...abc",
      productIds: [1],
      quantities: [2],
      totalPaid: "0.2",
      status: "Pending",
      timestamp: Date.now(),
      shippingInfo: {
        address: "123 Main St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA"
      }
    },
    {
      id: 2,
      buyer: "0x456...def",
      productIds: [2],
      quantities: [1],
      totalPaid: "0.05",
      status: "Accepted",
      timestamp: Date.now() - 86400000, // 1 day ago
      shippingInfo: {
        address: "456 Market St",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
        country: "USA"
      }
    }
  ]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newProduct, setNewProduct] = useState<{ name: string; price: string; stock: string } | null>(null);

  const handleAddProduct = (product: Omit<Product, 'id' | 'isActive'>) => {
    const newProduct: Product = {
      ...product,
      id: products.length + 1,
      isActive: true
    };
    setProducts(prev => [...prev, newProduct]);
    setShowAddProduct(false);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: number) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleUpdateOrderStatus = (orderId: number, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Accepted': return 'bg-blue-100 text-blue-800';
      case 'Shipped': return 'bg-purple-100 text-purple-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
                      className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
          onClose={() => setShowAddProduct(false)}
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
        />
      )}
    </div>
  );
}; 