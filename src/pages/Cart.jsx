import React from 'react';
import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';
import './Cart.css';

import { sanitizeImageUrl, handleImageError } from '../utils/imageUtils';

const CartItem = ({ item, handleQuantityChange, removeFromCart }) => {
  const [localQty, setLocalQty] = React.useState(String(item.quantity));

  React.useEffect(() => {
    setLocalQty(String(item.quantity));
  }, [item.quantity]);

  const product = item?.product || {};
  const variantId = item?.variantId || null;
  const variantLabel = String(item?.variantLabel || '').trim();
  const name = product?.name || item?.name || 'Product';
  const unit = product?.unit || 'unit';
  const imgSrc = product?.image || '/placeholder-product.svg'; // Updated placeholder to .svg

  // Try to find available stock from product or variant
  const availableStock = (() => {
    if (variantId && product.variants) {
      const v = product.variants.find(v => String(v._id) === String(variantId));
      if (v && v.stock !== null) return v.stock;
    }
    return product.stock ?? 999;
  })();

  const onQtyChange = (val) => {
    setLocalQty(val);
    if (val !== '') {
      const parsed = parseInt(val);
      if (!isNaN(parsed) && parsed > 0) {
        const capped = Math.min(parsed, availableStock);
        if (capped !== item.quantity) {
          const pId = item.productId || (product && product._id) || item.product;
          if (pId) handleQuantityChange(String(pId), variantId, capped);
        }
      }
    }
  };

  const onBlur = () => {
    if (localQty === '' || parseInt(localQty) <= 0) {
      const pId = item.productId || (product && product._id) || item.product;
      handleQuantityChange(String(pId || 'removed'), variantId, 0, item._id); // Removes if 0
    } else {
      const parsed = Math.min(parseInt(localQty), availableStock);
      setLocalQty(String(parsed));
    }
  };

  const isUnavailable = !product || Object.keys(product).length === 0 || !product._id;

  return (
    <div className={`cart-item ${isUnavailable ? 'unavailable' : ''}`}>
      <img
        src={isUnavailable ? '/placeholder-product.svg' : sanitizeImageUrl(imgSrc)}
        alt={name}
        onError={(e) => handleImageError(e)}
      />
      <div className="item-details">
        <h3 className={isUnavailable ? 'unavailable' : ''}>{name}</h3>
        {isUnavailable ? (
          <span className="unavailable-badge">Unavailable</span>
        ) : variantLabel ? (
          <p>₹{item.price} ({variantLabel})</p>
        ) : (
          <p>₹{item.price} per {unit}</p>
        )}
      </div>
      <div className="quantity-controls">
        <button
          disabled={isUnavailable}
          onClick={() => handleQuantityChange(item.productId || product._id || item.product, variantId, item.quantity - 1)}
        >-</button>
        <input
          type="number"
          className="quantity-input"
          value={localQty}
          disabled={isUnavailable}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onQtyChange(e.target.value)}
          onBlur={onBlur}
        />
        <button
          disabled={isUnavailable}
          onClick={() => handleQuantityChange(item.productId || product._id || item.product, variantId, item.quantity + 1)}
        >+</button>
      </div>
      <div className="item-total">
        ₹{(item.price * item.quantity).toFixed(2)}
      </div>
      <button
        onClick={() => {
          const pId = item.productId || (product && product._id) || item.product;
          removeFromCart(String(pId || 'removed'), variantId, item._id);
        }}
        className="remove-btn"
      >
        Remove
      </button>
    </div>
  );
};

const Cart = () => {
  const { cart, updateCartItem, removeFromCart, loading } = useCart();


  const handleQuantityChange = async (productId, variantId, newQuantity, cartItemId = null) => {
    if (newQuantity <= 0) {
      await removeFromCart(productId, variantId, cartItemId);
    } else {
      await updateCartItem(productId, newQuantity, variantId);
    }
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Your cart is empty</h2>
        <p>Add some products to get started!</p>
        <Link to="/products" className="btn btn-primary">
          Shop Now
        </Link>
      </div>
    );
  }

  const hasUnavailableItems = cart.items.some(it => !it.product || Object.keys(it.product).length === 0 || !it.product._id);

  return (
    <div className="cart-page">
      <div className="container">
        <h1>Shopping Cart</h1>
        <div className="cart-content">
          <div className="cart-items">
            {cart.items.map((item, index) => (
              <CartItem
                key={`${item.product?._id || item.productId || index}-${item.variantId || 'base'}`}
                item={item}
                handleQuantityChange={handleQuantityChange}
                removeFromCart={removeFromCart}
              />
            ))}
          </div>
          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-line">
              <span>Total Items:</span>
              <span>{cart.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="summary-line total">
              <span>Total Amount:</span>
              <span>₹{cart.totalAmount.toFixed(2)}</span>
            </div>

            {hasUnavailableItems && (
              <div className="checkout-warning">
                ⚠️ Please remove unavailable items to proceed.
              </div>
            )}

            <Link
              to={hasUnavailableItems ? '#' : "/checkout"}
              className={`btn checkout-btn ${hasUnavailableItems ? 'disabled' : ''}`}
            >
              Proceed to Checkout
            </Link>

            <div className="continue-shopping-link">
              <Link to="/products">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
