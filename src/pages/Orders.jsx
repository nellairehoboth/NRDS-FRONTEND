import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import api from '../api/axios';
import './Orders.css';


const Orders = () => {
  const showConfirm = useConfirm();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchOrders = React.useCallback(async () => {
    try {
      const response = await api.get('/api/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDelete = async (order) => {
    try {
      if (!order) return;
      const ok = await showConfirm('Remove Order', `Remove order ${order.orderNumber} from history?`);
      if (!ok) return;
      setActionMessage('');
      setDeletingId(order._id);
      const res = await api.delete(`/api/orders/${order._id}`);
      if (res?.data?.success) {
        setOrders(prev => prev.filter(o => o._id !== order._id));
        setActionMessage('Order removed from history.');
      } else {
        setActionMessage('Failed to remove order from history.');
      }
    } catch (err) {
      console.error('Delete order from history failed:', err);
      setActionMessage('Failed to remove order from history.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearHistory = async () => {
    try {
      const ok = await showConfirm('Clear History', 'Clear your entire order history? This does not cancel orders; it only hides them from your view.');
      if (!ok) return;
      setActionMessage('');
      const res = await api.post('/api/orders/clear');
      if (res?.data?.success) {
        setOrders([]);
        setActionMessage('Order history cleared.');
      } else {
        setActionMessage('Failed to clear order history.');
      }
    } catch (err) {
      console.error('Clear order history failed:', err);
      setActionMessage('Failed to clear order history.');
    }
  };

  const handleCancel = async (order) => {
    try {
      if (!order || !['CREATED', 'PAYMENT_PENDING', 'pending'].includes(order.status)) return;
      const ok = await showConfirm('Cancel Order', `Cancel order ${order.orderNumber}?`);
      if (!ok) return;
      setActionMessage('');
      setCancelingId(order._id);
      const res = await api.put(`/api/orders/${order._id}/cancel`);
      const updated = res?.data?.order;
      if (updated) {
        setOrders(prev => prev.map(o => (o._id === order._id ? updated : o)));
        setActionMessage('Order cancelled successfully.');
      } else {
        setActionMessage('Order cancellation completed, but failed to refresh data.');
      }
    } catch (err) {
      console.error('Cancel order failed:', err);
      setActionMessage('Failed to cancel order.');
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      CREATED: '#64748b',
      PAYMENT_PENDING: '#f59e0b',
      PAID: '#22c55e',
      ADMIN_CONFIRMED: '#3b82f6',
      SHIPPED: '#8b5cf6',
      DELIVERED: '#16a34a',
      CANCELLED: '#ef4444',
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#f59e0b',
      shipped: '#8b5cf6',
      delivered: '#16a34a',
      cancelled: '#ef4444'
    };
    return colors[status] || '#666';
  };

  const getStatusLabel = (status) => {
    const labels = {
      CREATED: 'Created',
      PAYMENT_PENDING: 'Payment Pending',
      PAID: 'Paid',
      ADMIN_CONFIRMED: 'Admin Confirmed',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      pending: 'Pending',
      confirmed: 'Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <h2>No orders found</h2>
        <p>You haven't placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="container">
        <div className="orders-header-bar">
          <h1>My Orders</h1>
          {orders.length > 0 && (
            <button className="clear-history-btn" onClick={handleClearHistory} title="Clear entire history">
              Clear History
            </button>
          )}
        </div>

        {actionMessage && (
          <div className="action-message" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '600' }}>
            {actionMessage}
          </div>
        )}

        <div className="orders-list">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.orderNumber}</h3>
                  <p>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="order-status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>

              <div className="order-body">
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div className="order-stats">
                    <div className="order-total-price">
                      Total: ₹{order.totalAmount}
                    </div>
                    <div className="order-payment-info">
                      Payment: {order.paymentMethod.toUpperCase()}
                      <span className={`payment-status-pill ${order.paymentStatus}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="order-actions">
                    <Link className="view-details-btn" to={`/orders/${order._id}`}>
                      View Details
                    </Link>

                    {['CREATED', 'PAYMENT_PENDING', 'pending'].includes(order.status) && (
                      <button
                        className="cancel-order-btn"
                        onClick={() => handleCancel(order)}
                        disabled={cancelingId === order._id}
                      >
                        {cancelingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}

                    <button
                      className="delete-order-btn"
                      onClick={() => handleDelete(order)}
                      disabled={deletingId === order._id}
                    >
                      {deletingId === order._id ? 'Removing...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;
