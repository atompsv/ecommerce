"use client";

import React, { createContext, useContext, useState } from 'react';

interface CartItem {
  productId: number;
  name: string;
  price: string;
  seller: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  seller: string | null;
  setSeller: (seller: string | null) => void;
  totalItems: number;
  totalPrice: string;
  closeCart: () => void;
}

// Create the context with a default value
const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {
    console.warn('addToCart was called without a CartProvider');
  },
  removeFromCart: () => {
    console.warn('removeFromCart was called without a CartProvider');
  },
  updateQuantity: () => {
    console.warn('updateQuantity was called without a CartProvider');
  },
  clearCart: () => {
    console.warn('clearCart was called without a CartProvider');
  },
  seller: null,
  setSeller: () => {
    console.warn('setSeller was called without a CartProvider');
  },
  totalItems: 0,
  totalPrice: '0',
  closeCart: () => {
    console.warn('closeCart was called without a CartProvider');
  }
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [seller, setSeller] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    console.log('Adding to cart:', item);
    
    setItems(currentItems => {
      // If there's a different seller in the cart, clear it first
      if (seller && seller !== item.seller) {
        console.log('Different seller detected, clearing cart');
        setSeller(item.seller);
        return [{ ...item, quantity: 1 }];
      }

      // If this is the first item, set the seller
      if (!seller) {
        setSeller(item.seller);
      }

      const existingItem = currentItems.find(i => i.productId === item.productId);
      
      if (existingItem) {
        // If item exists, increase quantity
        const newItems = currentItems.map(i => 
          i.productId === item.productId 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
        console.log('Updated existing item, new items:', newItems);
        return newItems;
      } else {
        // If item doesn't exist, add new item
        const newItems = [...currentItems, { ...item, quantity: 1 }];
        console.log('Added new item, new items:', newItems);
        return newItems;
      }
    });
  };

  const removeFromCart = (productId: number) => {
    console.log('Removing from cart:', productId);
    setItems(currentItems => {
      const newItems = currentItems.filter(item => item.productId !== productId);
      // If cart is empty, clear seller
      if (newItems.length === 0) {
        setSeller(null);
      }
      return newItems;
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    console.log('Updating quantity:', { productId, quantity });
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    console.log('Clearing cart');
    setItems([]);
    setSeller(null);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemTotal = parseFloat(item.price) * item.quantity;
    return sum + itemTotal;
  }, 0).toFixed(18);

  console.log('Current cart state:', { items, totalItems, totalPrice, seller });

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    seller,
    setSeller,
    totalItems,
    totalPrice,
    closeCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    console.error('useCart must be used within a CartProvider');
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 