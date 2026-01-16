import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { loadRazorpayScript } from '../utils/razorpay';
import './OrderDetails.css';
import { useI18n } from '../contexts/I18nContext';
import { handlePrintInvoice } from '../utils/invoiceUtils';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const { lang } = useI18n();
  const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;
  const handlePrint = () => handlePrintInvoice(order);

  const handleRetryPayment = async () => {
    if (!order) return;
    setRetrying(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) {
        alert('Failed to load Razorpay SDK. Please check your connection.');
        return;
      }

      const rpRes = await api.post('/api/orders/razorpay/order', { orderId: order._id });
      if (!rpRes?.data?.success) {
        alert(rpRes?.data?.message || 'Failed to initialize payment.');
        return;
      }

      const { keyId, razorpayOrderId, amount, currency: rpCurrency } = rpRes.data;

      const options = {
        key: keyId,
        amount,
        currency: rpCurrency,
        name: 'Nellai Rehoboth Department Store',
        description: `Order #${order.orderNumber}`,
        order_id: razorpayOrderId,
        handler: async (rzp) => {
          try {
            const verifyRes = await api.post('/api/orders/razorpay/verify', {
              orderId: order._id,
              razorpay_order_id: rzp.razorpay_order_id,
              razorpay_payment_id: rzp.razorpay_payment_id,
              razorpay_signature: rzp.razorpay_signature,
            });

            if (verifyRes?.data?.success) {
              alert('Payment successful!');
              window.location.reload();
            } else {
              alert(verifyRes?.data?.message || 'Payment verification failed.');
            }
          } catch (err) {
            console.error('Verify failed:', err);
            alert('Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            alert('Payment was cancelled.');
          },
        },
        theme: { color: '#2c5530' },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (err) {
      console.error('Retry error:', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to start payment retry.';
      alert(msg);
    } finally {
      setRetrying(false);
    }
  };

  const numberToWords = (num) => {
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const inWords = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
    };
    return inWords(num).trim();
  };

  const amountInWords = (amount) => {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = '';
    if (rupees > 0) words += numberToWords(rupees) + ' rupees';
    if (paise > 0) words += (words ? ' and ' : '') + numberToWords(paise) + ' paise';
    return words ? words + ' only' : 'zero rupees only';
  };

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/orders/${id}`);
        setOrder(res.data.order);
      } catch (err) {
        console.error('Failed to load order:', err);
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  const getStatusColor = (status) => {
    const colors = {
      CREATED: '#64748b',
      PAYMENT_PENDING: '#f59e0b',
      PAID: '#22c55e',
      ADMIN_CONFIRMED: '#3b82f6',
      SHIPPED: '#8b5cf6',
      DELIVERED: '#16a34a',
      CANCELLED: '#ef4444'
    };
    return colors[status] || '#666';
  };

  if (loading) return <div className="order-details-page"><div className="container"><h2>Loading order...</h2></div></div>;
  if (error) return <div className="order-details-page"><div className="container"><h2>{error}</h2><Link to="/orders" className="back-btn">Back to Orders</Link></div></div>;
  if (!order) return <div className="order-details-page"><div className="container"><h2>Order not found</h2><Link to="/orders" className="back-btn">Back to Orders</Link></div></div>;

  const isRestricted = ['PAYMENT_PENDING', 'CANCELLED', 'cancelled', 'pending'].includes(order.status) || order.paymentStatus === 'failed';

  if (isRestricted) {
    return (
      <div className="order-details-page">
        <div className="container">
          <div className="restricted-view">
            <h2>Invoice Restricted</h2>
            <p>
              {order.status === 'CANCELLED' || order.status === 'cancelled'
                ? 'This order has been cancelled. No invoice is available.'
                : order.paymentStatus === 'failed'
                  ? 'Payment failed for this order. Please try again or contact support.'
                  : 'Invoices are only generated for successful orders.'}
            </p>
            <p style={{ marginTop: '10px' }}>Current Status: <span className="status-pill" style={{ backgroundColor: getStatusColor(order.status) }}>{order.status}</span></p>
            <div className="restricted-actions">
              {(order.status === 'PAYMENT_PENDING' || order.status === 'pending') && (
                <button
                  className="retry-payment-btn"
                  onClick={handleRetryPayment}
                  disabled={retrying}
                  style={{ width: 'auto' }}
                >
                  {retrying ? 'Starting Payment...' : 'Retry Payment'}
                </button>
              )}
              <Link to="/orders" className="back-btn">Back to My Orders</Link>
              <Link to="/products" className="back-btn" style={{ background: '#2c5530', color: 'white' }}>Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute GST split rule: default CGST+SGST if TN, else IGST
  const storeState = 'Tamil Nadu';
  const shipState = order?.shippingAddress?.state || '';
  const isIntraState = shipState && storeState && shipState.toLowerCase() === storeState.toLowerCase();

  // Compute line-level and totals
  const items = (order.items || []).map((item) => {
    const rate = Number((item.tax?.gstRate ?? item.product?.tax?.gstRate) || 0);
    const inclusive = Boolean(item.tax?.inclusive ?? item.product?.tax?.inclusive ?? false);
    const subtotal = Number(item.subtotal ?? (item.price * item.quantity) ?? 0);
    const taxFactor = rate / 100;
    let taxable = subtotal;
    let tax = 0;
    if (rate > 0) {
      if (inclusive) {
        taxable = subtotal / (1 + taxFactor);
        tax = subtotal - taxable;
      } else {
        taxable = subtotal;
        tax = taxable * taxFactor;
      }
    }
    const cgst = isIntraState ? tax / 2 : 0;
    const sgst = isIntraState ? tax / 2 : 0;
    const igst = isIntraState ? 0 : tax;
    return { ...item, rate, subtotal, taxable, tax, cgst, sgst, igst };
  });

  const totals = items.reduce(
    (acc, i) => {
      acc.qty += Number(i.quantity || 0);
      acc.taxable += i.taxable;
      acc.tax += i.tax;
      acc.cgst += i.cgst;
      acc.sgst += i.sgst;
      acc.igst += i.igst;
      acc.subtotal += i.subtotal;
      return acc;
    },
    { qty: 0, taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, subtotal: 0 }
  );

  const grandTotal = order.totalAmount;
  const deliveryCharge = order.deliveryCharge || 0;

  return (
    <div className="order-details-page">
      <div className="container order-details-container">
        <div className="order-details-header">
          <div>
            <h1>Order Details</h1>
            <div className="order-meta">
              Order #{order.orderNumber} • {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="order-header-actions no-print">
            <button className="print-btn" onClick={handlePrint}>
              <span>🖨️</span> Print Invoice
            </button>
            <Link to="/orders" className="back-btn">Back to Orders</Link>
          </div>
        </div>

        <div className="order-details-grid">
          <div className="details-main-content">
            <div className="details-card">
              <h3>📦 Order Items</h3>
              <div className="items-list">
                {items.map((item, idx) => (
                  <div key={idx} className="order-item-row">
                    <div className="item-info">
                      <span className="item-name">{(lang === 'ta' && (item?.product?.nameTa || item?.nameTa)) ? (item?.product?.nameTa || item?.nameTa) : item.name} {item?.variantLabel ? ` (${item.variantLabel})` : ''}</span>
                      <span className="item-secondary">{item.quantity} x {currency(item.price)} (GST {item.rate}%)</span>
                    </div>
                    <span className="item-price-total">{currency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-grid">
              <div className="details-card">
                <h3>📍 Shipping Address</h3>
                <div className="address-details">
                  <p><strong>{order.shippingAddress.name}</strong></p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && <p><span className="label">Phone:</span><span className="value">{order.shippingAddress.phone}</span></p>}
                </div>
              </div>

              <div className="details-card">
                <h3>💳 Payment Information</h3>
                <div className="payment-details">
                  <p>
                    <span className="label">Method:</span>
                    <span className="value">{order.paymentMethod?.toUpperCase()}</span>
                  </p>
                  <p>
                    <span className="label">Status:</span>
                    <span className="status-pill" style={{ backgroundColor: order.paymentStatus === 'paid' ? '#22c55e' : '#f59e0b' }}>
                      {order.paymentStatus}
                    </span>
                  </p>
                  <p>
                    <span className="label">Order Status:</span>
                    <span className="status-pill" style={{ backgroundColor: getStatusColor(order.status) }}>
                      {order.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="details-sidebar">
            <div className="details-card summary-card">
              <h3>🧾 Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{currency(totals.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Tax Total</span>
                <span>{currency(totals.tax)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>{deliveryCharge > 0 ? currency(deliveryCharge) : 'Free'}</span>
              </div>
              <div className="summary-row grand-total">
                <span>Total</span>
                <span>{currency(grandTotal)}</span>
              </div>

              <div style={{ marginTop: '20px', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                Amount in Words: {amountInWords(grandTotal)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderDetails;
