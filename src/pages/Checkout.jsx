import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Checkout.css';
import { useI18n } from '../contexts/I18nContext';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-js')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'India',
    phone: user?.phone || ''
  });

  const handleAddressChange = (field, value) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    // Basic client-side validation to match server requirements
    const required = ['name', 'street'];
    const missing = required.filter((k) => !String(shippingAddress[k] || '').trim());
    if (missing.length) {
      alert(t('checkout.required_fields', 'Please fill required fields:') + ' ' + missing.join(', '));
      return;
    }

    // Prepare minimal, clean items payload (only valid products with id)
    const items = (cart.items || [])
      .filter((it) => it && (it.product?._id || it.product))
      .map((it) => ({
        product: it.product?._id || it.product,
        variantId: it.variantId || null,
        quantity: it.quantity,
      }));

    if (!items.length) {
      alert(t('checkout.invalid_cart', 'Your cart has invalid items. Please re-add products and try again.'));
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items,
        totalAmount: cart.totalAmount,
        paymentMethod,
        shippingAddress: {
          ...shippingAddress,
          name: String(shippingAddress.name).trim(),
          street: String(shippingAddress.street).trim(),
        },
      };

      const response = await api.post('/api/orders', orderData);

      if (response.data.success) {
        const ord = response.data.order;
        if (paymentMethod === 'razorpay') {
          const ok = await loadRazorpayScript();
          if (!ok) {
            alert(t('checkout.sdk_not_loaded', 'Failed to load Razorpay checkout. Please check your internet connection and try again.'));
            return;
          }

          const rpRes = await api.post('/api/orders/razorpay/order', { orderId: ord._id });
          if (!rpRes?.data?.success) {
            alert(rpRes?.data?.message || t('checkout.init_failed', 'Failed to initialize Razorpay payment.'));
            return;
          }

          const { keyId, razorpayOrderId, amount, currency } = rpRes.data;

          const options = {
            key: keyId,
            amount,
            currency,
            name: t('brand.name', 'Nellai Rehoboth Department Store'),
            description: `${t('checkout.title', 'Checkout')} - ${t('order_details.order', 'Order')} ${ord.orderNumber}`,
            order_id: razorpayOrderId,
            prefill: {
              name: shippingAddress.name,
              email: user?.email || '',
              contact: shippingAddress.phone || '',
            },
            notes: {
              orderId: ord._id,
            },
            handler: async (rzp) => {
              try {
                const verifyRes = await api.post('/api/orders/razorpay/verify', {
                  orderId: ord._id,
                  razorpay_order_id: rzp.razorpay_order_id,
                  razorpay_payment_id: rzp.razorpay_payment_id,
                  razorpay_signature: rzp.razorpay_signature,
                });

                if (verifyRes?.data?.success) {
                  alert(`${t('checkout.pay_success', 'Payment successful!\nOrder No:')} ${verifyRes.data.order.orderNumber}`);
                  await clearCart();
                  navigate(`/orders/${verifyRes.data.order._id}`);
                } else {
                  alert(verifyRes?.data?.message || t('checkout.pay_verify_failed', 'Payment verification failed.'));
                }
              } catch (err) {
                console.error('Razorpay verify failed:', err);
                const msg = err?.response?.data?.message || err?.message || t('checkout.pay_verify_failed', 'Payment verification failed.');
                alert(msg);
              }
            },
            modal: {
              ondismiss: async () => {
                try {
                  // Call backend to cancel payment, restore stock, and hide order
                  await api.post(`/api/orders/${ord._id}/cancel-payment`);
                  alert(t('checkout.pay_cancelled', 'Payment was cancelled. Your cart items have been restored.'));
                  navigate('/');
                } catch (err) {
                  console.error('Failed to cancel payment:', err);
                  // Even if the API call fails, still navigate away
                  alert(t('checkout.pay_cancelled', 'Payment was cancelled.'));
                  navigate('/');
                }
              },
            },
            theme: {
              color: '#2c5530',
            },
          };

          const Razorpay = window.Razorpay;
          if (!Razorpay) {
            alert(t('checkout.sdk_not_available', 'Razorpay SDK not available. Please refresh and try again.'));
            return;
          }

          const rzp1 = new Razorpay(options);
          rzp1.on('payment.failed', (resp) => {
            console.error('Razorpay payment failed:', resp);
            alert(resp?.error?.description || t('checkout.pay_failed', 'Payment failed. Please try again.'));
          });
          rzp1.open();
        } else {
          alert(`${t('checkout.order_placed', 'Order placed successfully!\nOrder No:')} ${ord.orderNumber}`);
          await clearCart();
          navigate(`/orders/${ord._id}`);
        }
      } else {
        const msg = response.data?.message || t('checkout.place_failed', 'Failed to place order. Please try again.');
        alert(msg);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      const msg = error?.response?.data?.message || error?.message || t('checkout.place_failed', 'Failed to place order. Please try again.');
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>{t('checkout.empty_title', 'No items to checkout')}</h2>
        <p>{t('checkout.empty_sub', 'Add some products to your cart first!')}</p>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>{t('checkout.title', 'Checkout')}</h1>
        <div className="checkout-content">
          <div className="checkout-form">
            <div className="shipping-section">
              <h3>{t('checkout.shipping', 'Shipping Address')}</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder={t('checkout.name', 'Full Name')}
                  value={shippingAddress.name}
                  onChange={(e) => handleAddressChange('name', e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('checkout.phone', 'Phone Number')}
                  value={shippingAddress.phone}
                  onChange={(e) => handleAddressChange('phone', e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('checkout.street', 'Street Address')}
                  value={shippingAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="full-width"
                />
                <input
                  type="text"
                  placeholder={t('checkout.city', 'City')}
                  value={shippingAddress.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('checkout.state', 'State')}
                  value={shippingAddress.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('checkout.zip', 'ZIP Code')}
                  value={shippingAddress.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                />
              </div>
            </div>

            <div className="payment-section">
              <h3>{t('checkout.payment', 'Payment Method')}</h3>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>{t('checkout.pay_cod', 'Cash on Delivery')}</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>{t('checkout.pay_razorpay', 'UPI/Cards/Wallets (Razorpay)')}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="order-summary">
            <h3>{t('checkout.order_summary', 'Order Summary')}</h3>
            <div className="order-items">
              {cart.items.map((item, index) => {
                const product = item?.product || {};
                const key = product?._id || item?.productId || `idx-${index}`;
                const name = product?.name || item?.name || 'Product';
                return (
                  <div key={key} className="order-item">
                    <span>{name} x {item.quantity}</span>
                    <span>₹{(() => {
                      const subtotal = item.price * item.quantity;
                      const rate = Number(item.tax?.gstRate || 0);
                      const inclusive = Boolean(item.tax?.inclusive ?? false);
                      if (rate > 0 && !inclusive) {
                        return (subtotal + (subtotal * rate / 100)).toFixed(2);
                      }
                      return subtotal.toFixed(2);
                    })()}</span>
                  </div>
                );
              })}
            </div>
            <div className="order-total">
              <strong>{t('checkout.total', 'Total:')} ₹{cart.totalAmount.toFixed(2)}</strong>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="btn btn-primary place-order-btn"
            >
              {loading ? t('checkout.placing', 'Placing Order...') : t('checkout.place_order', 'Place Order')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
