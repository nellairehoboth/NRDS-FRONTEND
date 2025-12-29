import React from 'react';
import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';
import './Cart.css';
import { useI18n } from '../contexts/I18nContext';

const CartItem = ({ item, handleQuantityChange, removeFromCart, t }) => {
  const [localQty, setLocalQty] = React.useState(String(item.quantity));

  React.useEffect(() => {
    setLocalQty(String(item.quantity));
  }, [item.quantity]);

  const product = item?.product || {};
  const variantId = item?.variantId || null;
  const variantLabel = String(item?.variantLabel || '').trim();
  const name = product?.name || item?.name || 'Product';
  const unit = product?.unit || 'unit';
  const imgSrc = product?.image || '/placeholder-product.jpg';

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
          handleQuantityChange(product._id || item.productId, variantId, capped);
        }
      }
    }
  };

  const onBlur = () => {
    if (localQty === '' || parseInt(localQty) <= 0) {
      handleQuantityChange(product._id || item.productId, variantId, 0); // Removes if 0
    } else {
      const parsed = Math.min(parseInt(localQty), availableStock);
      setLocalQty(String(parsed));
    }
  };

  return (
    <div className="cart-item">
      <img
        src={imgSrc}
        alt={name}
        onError={(e) => {
          if (e.currentTarget.src.endsWith('/placeholder-product.jpg')) return;
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/placeholder-product.jpg';
        }}
      />
      <div className="item-details">
        <h3>{name}</h3>
        {variantLabel ? (
          <p>₹{item.price} ({variantLabel})</p>
        ) : (
          <p>₹{item.price} {t('cart.per', 'per')} {unit}</p>
        )}
      </div>
      <div className="quantity-controls">
        <button onClick={() => handleQuantityChange(product._id || item.productId, variantId, item.quantity - 1)}>-</button>
        <input
          type="number"
          className="quantity-input"
          value={localQty}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onQtyChange(e.target.value)}
          onBlur={onBlur}
        />
        <button onClick={() => handleQuantityChange(product._id || item.productId, variantId, item.quantity + 1)}>+</button>
      </div>
      <div className="item-total">
        ₹{(item.price * item.quantity).toFixed(2)}
      </div>
      <button
        onClick={() => removeFromCart(product._id || item.productId, variantId)}
        className="remove-btn"
      >
        {t('cart.remove', 'Remove')}
      </button>
    </div>
  );
};

const Cart = () => {
  const { cart, updateCartItem, removeFromCart, loading } = useCart();
  const { t } = useI18n();

  const handleQuantityChange = async (productId, variantId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeFromCart(productId, variantId);
    } else {
      await updateCartItem(productId, newQuantity, variantId);
    }
  };

  if (loading) {
    return <div className="loading">{t('cart.loading', 'Loading cart...')}</div>;
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <h2>{t('cart.empty_title', 'Your cart is empty')}</h2>
        <p>{t('cart.empty_sub', 'Add some products to get started!')}</p>
        <Link to="/products" className="btn btn-primary">
          {t('cart.shop_now', 'Shop Now')}
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1>{t('cart.title', 'Shopping Cart')}</h1>
        <div className="cart-content">
          <div className="cart-items">
            {cart.items.map((item, index) => (
              <CartItem
                key={`${item.product?._id || item.productId || index}-${item.variantId || 'base'}`}
                item={item}
                handleQuantityChange={handleQuantityChange}
                removeFromCart={removeFromCart}
                t={t}
              />
            ))}
          </div>
          <div className="cart-summary">
            <h3>{t('cart.summary', 'Order Summary')}</h3>
            <div className="summary-line">
              <span>{t('cart.total_items', 'Total Items:')}</span>
              <span>{cart.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="summary-line total">
              <span>{t('cart.total_amount', 'Total Amount:')}</span>
              <span>₹{cart.totalAmount.toFixed(2)}</span>
            </div>
            <Link to="/checkout" className="btn btn-primary checkout-btn">
              {t('cart.checkout', 'Proceed to Checkout')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
