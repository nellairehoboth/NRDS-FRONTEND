import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], totalAmount: 0 });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCart({ items: [], totalAmount: 0 });
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/cart');
      setCart(response.data.cart || { items: [], totalAmount: 0 });
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1, variantId = null) => {
    try {
      const response = await api.post('/api/cart/add', {
        productId,
        quantity,
        variantId
      });
      setCart(response.data.cart);
      return { success: true, message: 'Item added to cart' };
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add item to cart';
      return { success: false, message: errorMessage };
    }
  };

  const updateCartItem = async (productId, quantity, variantId = null) => {
    try {
      const response = await api.put('/api/cart/update', {
        productId,
        quantity,
        variantId
      });
      setCart(response.data.cart);
      return { success: true };
    } catch (error) {
      console.error('Error updating cart:', error);
      return { success: false };
    }
  };

  const removeFromCart = async (productId, variantId = null, cartItemId = null) => {
    try {
      let qp = variantId ? `?variantId=${encodeURIComponent(String(variantId))}` : '';
      if (cartItemId) {
        qp += (qp ? '&' : '?') + `cartItemId=${encodeURIComponent(String(cartItemId))}`;
      }
      const response = await api.delete(`/api/cart/remove/${productId}${qp}`);
      setCart(response.data.cart);
      return { success: true };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { success: false };
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/api/cart/clear');
      setCart({ items: [], totalAmount: 0 });
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false };
    }
  };

  const getCartItemCount = () => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartItemCount,
    fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
