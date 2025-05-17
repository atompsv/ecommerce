import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ProductList } from './components/Home/ProductList';
import { SellerDashboard } from './components/Home/SellerDashboard';
import { OrderHistory } from './components/Home/OrderHistory';
import { Header } from './components/Header';
import { Cart } from './components/Home/Cart';


function App() {
  return (
    <Router>
      <CartProvider>
        <div className="min-h-screen bg-gradient-to-br from-[#f6f7fb] to-[#e9eaf3] text-gray-900">
          <Header />
          <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<ProductList />} />
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/orders" element={<OrderHistory />} />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </Router>
  );
}

export default App; 