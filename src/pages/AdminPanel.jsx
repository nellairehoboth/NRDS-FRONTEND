import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import './AdminPanel.css';
import { useI18n } from '../contexts/I18nContext';
import { SHOP_LOCATION } from '../config';
import MapModal from '../components/MapModal';

const AdminPanel = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [showOrderMap, setShowOrderMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState('all');
  const [variantLabelFilter, setVariantLabelFilter] = useState('all');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [unseenOrders, setUnseenOrders] = useState([]);
  const [lastSeenOrderTs, setLastSeenOrderTs] = useState(() => {
    const raw = localStorage.getItem('admin_last_seen_order_ts');
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  });
  const [hasInitializedLastSeen, setHasInitializedLastSeen] = useState(() => {
    return Boolean(localStorage.getItem('admin_last_seen_order_ts'));
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', brand: '', barcode: '', description: '', price: '', mrp: '', gstRate: '', taxInclusive: true, category: 'fruits', stock: '', unit: 'kg', expiryDate: '', image: '', variants: [],
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', brand: '', barcode: '', description: '', price: '', mrp: '', gstRate: '', taxInclusive: true, category: 'fruits', stock: '', unit: 'kg', expiryDate: '', image: '', isActive: true, variants: [],
  });
  const [settings, setSettings] = useState({
    deliveryChargePerKm: '0',
    freeDistanceLimit: '5',
    maxDeliveryDistance: '20',
    freeDeliveryThreshold: '500',
    storeLatitude: 10.7870,
    storeLongitude: 79.1378,
    deliverySlabs: []
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [isLocatingStore, setIsLocatingStore] = useState(false);
  const [showStoreMap, setShowStoreMap] = useState(false);

  const CATEGORIES = [
    'fruits', 'vegetables', 'dairy', 'bakery', 'meat',
    'frozen', 'beverages', 'snacks', 'pantry', 'household'
  ];

  const UNITS = ['kg', 'g', 'lb', 'piece', 'liter', 'ml', 'pack', 'dozen'];

  const handleStoreMapConfirm = (loc) => {
    setSettings({ ...settings, storeLatitude: loc.lat, storeLongitude: loc.lng });
    setShowStoreMap(false);
  };

  const handleStoreLocate = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    setIsLocatingStore(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    const success = (pos) => {
      setSettings(prev => ({
        ...prev,
        storeLatitude: pos.coords.latitude,
        storeLongitude: pos.coords.longitude
      }));
      setIsLocatingStore(false);
      setShowStoreMap(true);
    };

    const error = (err) => {
      console.warn(`Admin Geolocation error (${err.code}): ${err.message}`);

      if (options.enableHighAccuracy) {
        // Retry without high accuracy
        navigator.geolocation.getCurrentPosition(success, (err2) => {
          alert('Position access denied or timed out');
          setIsLocatingStore(false);
        }, { ...options, enableHighAccuracy: false, timeout: 5000 });
      } else {
        alert('Position access denied or timed out');
        setIsLocatingStore(false);
      }
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  };

  const handleStoreAddressSearch = async (e) => {
    e?.preventDefault();
    if (!addressSearch.trim()) return;
    setIsLocatingStore(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setSettings({ ...settings, storeLatitude: parseFloat(data[0].lat), storeLongitude: parseFloat(data[0].lon) });
      } else {
        alert('Address not found');
      }
    } catch (err) {
      console.error(err);
      alert('Search failed');
    } finally {
      setIsLocatingStore(false);
    }
  };


  const normalizeVariants = (variants) => {
    if (!Array.isArray(variants)) return [];
    return variants.map((v) => {
      const label = String(v?.label || '').trim();
      const price = v?.price === '' || v?.price === null || v?.price === undefined ? '' : Number(v.price);
      const mrp = v?.mrp === '' || v?.mrp === null || v?.mrp === undefined ? '' : Number(v.mrp);
      const stock = v?.stock === '' || v?.stock === null || v?.stock === undefined ? '' : Number(v.stock);
      const isActive = v?.isActive !== undefined ? !!v.isActive : true;
      return { label, price, mrp, stock, isActive };
    });
  };

  const timeAgo = (iso) => {
    try {
      const d = new Date(iso);
      const diff = Math.max(0, Date.now() - d.getTime());
      const s = Math.floor(diff / 1000);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const dys = Math.floor(h / 24);
      return `${dys}d ago`;
    } catch (_) { return ''; }
  };

  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e) => {
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [notifOpen]);

  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
    else if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  useEffect(() => {
    if (hasInitializedLastSeen) return;
    const now = Date.now();
    localStorage.setItem('admin_last_seen_order_ts', String(now));
    setLastSeenOrderTs(now);
    setHasInitializedLastSeen(true);
  }, [hasInitializedLastSeen]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const response = await api.get('/api/admin/orders');
        const all = response.data.orders || [];
        const newOnes = all
          .filter(o => new Date(o?.createdAt || 0).getTime() > lastSeenOrderTs)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        if (alive) setUnseenOrders(newOnes);
      } catch (e) { }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [lastSeenOrderTs]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/products');
      setProducts(response.data.products || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/orders');
      setOrders(response.data.orders || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/settings');
      if (response.data.settings) {
        const s = response.data.settings;
        setSettings({
          deliveryChargePerKm: String(s.deliveryChargePerKm ?? 0),
          freeDistanceLimit: String(s.freeDistanceLimit ?? 5),
          maxDeliveryDistance: String(s.maxDeliveryDistance ?? 20),
          freeDeliveryThreshold: String(s.freeDeliveryThreshold ?? 500),
          storeLatitude: s.storeLatitude ?? 10.7870,
          storeLongitude: s.storeLongitude ?? 79.1378,
          deliverySlabs: s.deliverySlabs || []
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const body = {
        deliveryChargePerKm: Number(settings.deliveryChargePerKm),
        freeDistanceLimit: Number(settings.freeDistanceLimit),
        maxDeliveryDistance: Number(settings.maxDeliveryDistance),
        freeDeliveryThreshold: Number(settings.freeDeliveryThreshold),
        storeLatitude: Number(settings.storeLatitude),
        storeLongitude: Number(settings.storeLongitude),
        deliverySlabs: settings.deliverySlabs
      };
      await api.post('/api/settings/update', body);
      alert(t('admin.settings_save_success', 'Settings saved successfully!'));
    } catch (e) { alert(t('admin.settings_save_failed', 'Failed to save settings.')); }
    finally { setSavingSettings(false); }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/api/admin/orders/${orderId}`, { status });
      fetchOrders();
    } catch (e) { alert('Failed to update order status'); }
  };

  const quickConfirmOnline = async (order) => {
    if (!window.confirm('Confirm this online-paid order?')) return;
    await updateOrderStatus(order._id, 'ADMIN_CONFIRMED');
  };

  const quickDeliverCOD = async (order) => {
    if (!window.confirm('Mark this COD order as Delivered?')) return;
    const chain = ['ADMIN_CONFIRMED', 'SHIPPED', 'DELIVERED'];
    for (const next of chain) await api.put(`/api/admin/orders/${order._id}`, { status: next });
    fetchOrders();
  };

  const toValidVariants = (vars) => {
    return (vars || []).map(v => {
      const label = String(v?.label || '').trim();
      const p = parseFloat(v?.price);
      if (!label || isNaN(p) || p < 0) return null;
      return { label, price: p, mrp: parseFloat(v?.mrp) || 0, stock: parseInt(v?.stock) || 0, isActive: v?.isActive !== false };
    }).filter(Boolean);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload = { ...editForm, variants: toValidVariants(editForm.variants) };
      await api.put(`/api/admin/products/${editingProduct._id}`, payload);
      setEditingProduct(null);
      fetchProducts();
    } catch (e) { alert(e.response?.data?.message || 'Failed to update product'); }
    finally { setSavingEdit(false); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newProduct, variants: toValidVariants(newProduct.variants) };
      await api.post('/api/admin/products', payload);
      setShowAddProduct(false);
      setNewProduct({ name: '', brand: '', barcode: '', description: '', price: '', mrp: '', gstRate: '', taxInclusive: true, category: 'fruits', stock: '', unit: 'kg', expiryDate: '', image: '', variants: [] });
      fetchProducts();
    } catch (e) { alert(e.response?.data?.message || 'Failed to add product'); }
  };

  const markOrdersSeen = () => {
    const latestTs = unseenOrders.reduce((acc, o) => Math.max(acc, new Date(o.createdAt).getTime()), lastSeenOrderTs);
    const next = latestTs || Date.now();
    setLastSeenOrderTs(next);
    localStorage.setItem('admin_last_seen_order_ts', String(next));
    setUnseenOrders([]);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm(t('admin.confirm_delete', 'Are you sure you want to delete this product?'))) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      fetchProducts();
    } catch (e) { alert(t('admin.delete_failed', 'Failed to delete product')); }
  };

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    const matchesVariant = variantLabelFilter === 'all' || (p.variants || []).some(v => v.label === variantLabelFilter);
    return matchesQuery && matchesCategory && matchesVariant;
  });

  return (
    <div className="admin-panel">
      <div className="container">
        <div className="admin-header-row">
          <h1>{t('admin.title', 'Admin Panel')}</h1>
          <div className="admin-notifications">
            <button className="admin-bell-btn" onClick={() => setNotifOpen(!notifOpen)}>
              🔔 {unseenOrders.length > 0 && <span className="admin-bell-badge">{unseenOrders.length}</span>}
            </button>
            {notifOpen && (
              <div className="admin-notif-dropdown" ref={notifRef}>
                <div className="admin-notif-title">
                  <span>New Orders</span>
                  <button onClick={markOrdersSeen}>Mark Read</button>
                </div>
                <div className="admin-notif-list">
                  {unseenOrders.map(o => (
                    <div key={o._id} className="admin-notif-item">
                      <div>{o.orderNumber} - ₹{o.totalAmount}</div>
                      <small>{timeAgo(o.createdAt)}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-tabs">
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>Products</button>
          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Orders</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>

        {activeTab === 'products' && (
          <div className="products-management">
            <div className="section-header">
              <h2>Products</h2>
              <button onClick={() => setShowAddProduct(true)} className="btn btn-primary">Add Product</button>
            </div>
            <div className="products-table">
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td>₹{p.price}</td>
                      <td>{p.stock}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-sm btn-edit" onClick={() => { setEditingProduct(p); setEditForm({ ...p, variants: normalizeVariants(p.variants) }); }}>Edit</button>
                          <button className="btn-sm btn-delete" onClick={() => handleDeleteProduct(p._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-management">
            <h2>Orders</h2>
            <div className="orders-table">
              <table>
                <thead><tr><th>#</th><th>Customer</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id}>
                      <td>{o.orderNumber}</td>
                      <td>{o.user?.name}</td>
                      <td>₹{o.totalAmount}</td>
                      <td>
                        <select value={o.status} onChange={e => updateOrderStatus(o._id, e.target.value)}>
                          <option value="CREATED">Created</option>
                          <option value="ADMIN_CONFIRMED">Confirmed</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-sm btn-outline" onClick={() => setOrderDetail(o)}>View</button>
                          {o.paymentMethod === 'cod' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                            <button className="btn-sm btn-primary" onClick={() => quickDeliverCOD(o)}>COD Deliver</button>
                          )}
                          {o.paymentMethod !== 'cod' && !['ADMIN_CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(o.status) && (
                            <button className="btn-sm btn-edit" onClick={() => quickConfirmOnline(o)}>Confirm Online</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-management">
            <h2>Settings</h2>
            <form onSubmit={handleUpdateSettings}>
              <div style={{ display: 'grid', gap: '20px', maxWidth: '600px', background: 'white', padding: '20px', borderRadius: '8px' }}>
                <div className="form-group">
                  <label>Max Delivery Distance (KM)</label>
                  <input type="number" className="form-control" value={settings.maxDeliveryDistance} onChange={e => setSettings({ ...settings, maxDeliveryDistance: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Free Delivery Threshold (₹)</label>
                  <input type="number" className="form-control" value={settings.freeDeliveryThreshold} onChange={e => setSettings({ ...settings, freeDeliveryThreshold: e.target.value })} />
                </div>

                <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', background: '#f9f9f9' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '10px' }}>Store Geolocation & Address</label>

                  {/* Address Search */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="Type address to find coordinates..."
                      className="form-control"
                      style={{ flex: 1 }}
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                    />
                  </div>

                  {/* Action Buttons Row */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        flex: 1, minWidth: '150px', borderRadius: '30px', padding: '10px',
                        backgroundColor: '#2c5530', color: 'white', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none'
                      }}
                      onClick={handleStoreLocate}
                      disabled={isLocatingStore}
                    >
                      <img src="/gps-target-icon.png" alt="" style={{ width: '20px', height: '20px' }} /> Use Current Location
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        flex: 1, minWidth: '150px', borderRadius: '30px', padding: '10px',
                        backgroundColor: '#f1f1f1', color: '#333', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #ddd'
                      }}
                      onClick={handleStoreAddressSearch}
                      disabled={isLocatingStore}
                    >
                      🔍 Locate from Address
                    </button>
                  </div>

                  {/* Manual Coordinates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <small>Latitude</small>
                      <input placeholder="Lat" type="number" step="any" className="form-control" value={settings.storeLatitude} onChange={e => setSettings({ ...settings, storeLatitude: e.target.value })} />
                    </div>
                    <div>
                      <small>Longitude</small>
                      <input placeholder="Lng" type="number" step="any" className="form-control" value={settings.storeLongitude} onChange={e => setSettings({ ...settings, storeLongitude: e.target.value })} />
                    </div>
                  </div>
                </div>

                <MapModal
                  isOpen={showStoreMap}
                  onClose={() => setShowStoreMap(false)}
                  onConfirm={handleStoreMapConfirm}
                  initialLocation={{ lat: parseFloat(settings.storeLatitude), lng: parseFloat(settings.storeLongitude) }}
                  shopLocation={{ lat: parseFloat(settings.storeLatitude), lng: parseFloat(settings.storeLongitude) }}
                  title="Choose Store Location"
                />


                <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', background: '#f9f9f9' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '10px' }}>Delivery Slabs (KM)</label>
                  {settings.deliverySlabs.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                      <input style={{ width: '60px' }} type="number" value={s.minDistance} onChange={e => { const n = [...settings.deliverySlabs]; n[i].minDistance = e.target.value; setSettings({ ...settings, deliverySlabs: n }); }} />
                      <span>to</span>
                      <input style={{ width: '60px' }} type="number" value={s.maxDistance} onChange={e => { const n = [...settings.deliverySlabs]; n[i].maxDistance = e.target.value; setSettings({ ...settings, deliverySlabs: n }); }} />
                      <span>₹</span>
                      <input style={{ width: '80px' }} type="number" value={s.charge} onChange={e => { const n = [...settings.deliverySlabs]; n[i].charge = e.target.value; setSettings({ ...settings, deliverySlabs: n }); }} />
                      <button type="button" onClick={() => setSettings({ ...settings, deliverySlabs: settings.deliverySlabs.filter((_, idx) => idx !== i) })}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setSettings({ ...settings, deliverySlabs: [...settings.deliverySlabs, { minDistance: 0, maxDistance: 5, charge: 50 }] })}>+ Add Slab</button>
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingSettings}>{savingSettings ? 'Saving...' : 'Save Settings'}</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Product</h3>
              <button className="btn-close" onClick={() => setShowAddProduct(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddProduct}>
                <div className="form-grid">
                  <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                  <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} required className="admin-filter-select" style={{ width: '100%' }}>
                    <option value="" disabled>Select Category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <select value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} required className="admin-filter-select" style={{ width: '100%' }}>
                    <option value="" disabled>Select Unit</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" placeholder="Price (₹)" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} required />
                  <input type="number" placeholder="MRP (₹)" value={newProduct.mrp} onChange={e => setNewProduct({ ...newProduct, mrp: e.target.value })} />
                  <input type="number" placeholder="Stock" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} required />
                  <input type="text" placeholder="Image URL" value={newProduct.image} onChange={e => setNewProduct({ ...newProduct, image: e.target.value })} />
                  <textarea placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}></textarea>
                </div>
                {/* Variants Section for New Product */}
                <div className="variants-section">
                  <h4>Variants (Optional)</h4>
                  {newProduct.variants.map((v, i) => (
                    <div key={i} className="variant-row">
                      <input type="text" placeholder="Label (e.g. 500g)" value={v.label} onChange={e => { const n = [...newProduct.variants]; n[i].label = e.target.value; setNewProduct({ ...newProduct, variants: n }); }} />
                      <input type="number" placeholder="Price" value={v.price} onChange={e => { const n = [...newProduct.variants]; n[i].price = e.target.value; setNewProduct({ ...newProduct, variants: n }); }} />
                      <input type="number" placeholder="MRP" value={v.mrp} onChange={e => { const n = [...newProduct.variants]; n[i].mrp = e.target.value; setNewProduct({ ...newProduct, variants: n }); }} />
                      <input type="number" placeholder="Stock" value={v.stock} onChange={e => { const n = [...newProduct.variants]; n[i].stock = e.target.value; setNewProduct({ ...newProduct, variants: n }); }} />
                      <button type="button" className="btn-icon-danger" onClick={() => setNewProduct({ ...newProduct, variants: newProduct.variants.filter((_, idx) => idx !== i) })}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary" onClick={() => setNewProduct({ ...newProduct, variants: [...newProduct.variants, { label: '', price: '', mrp: '', stock: '', isActive: true }] })}>+ Add Variant</button>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Create Product</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button className="btn-close" onClick={() => setEditingProduct(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateProduct}>
                <div className="form-grid">
                  <input type="text" placeholder="Product Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                  <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} required className="admin-filter-select" style={{ width: '100%' }}>
                    <option value="" disabled>Select Category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <select value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} required className="admin-filter-select" style={{ width: '100%' }}>
                    <option value="" disabled>Select Unit</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" placeholder="Price (₹)" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} required />
                  <input type="number" placeholder="MRP (₹)" value={editForm.mrp} onChange={e => setEditForm({ ...editForm, mrp: e.target.value })} />
                  <input type="number" placeholder="Stock" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} required />
                  <input type="text" placeholder="Image URL" value={editForm.image} onChange={e => setEditForm({ ...editForm, image: e.target.value })} />
                  <textarea placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}></textarea>
                </div>
                {/* Variants Section for Edit Product */}
                <div className="variants-section">
                  <h4>Variants</h4>
                  {editForm.variants.map((v, i) => (
                    <div key={i} className="variant-row">
                      <input type="text" placeholder="Label" value={v.label} onChange={e => { const n = [...editForm.variants]; n[i].label = e.target.value; setEditForm({ ...editForm, variants: n }); }} />
                      <input type="number" placeholder="Price" value={v.price} onChange={e => { const n = [...editForm.variants]; n[i].price = e.target.value; setEditForm({ ...editForm, variants: n }); }} />
                      <input type="number" placeholder="MRP" value={v.mrp} onChange={e => { const n = [...editForm.variants]; n[i].mrp = e.target.value; setEditForm({ ...editForm, variants: n }); }} />
                      <input type="number" placeholder="Stock" value={v.stock} onChange={e => { const n = [...editForm.variants]; n[i].stock = e.target.value; setEditForm({ ...editForm, variants: n }); }} />
                      <label className="variant-active">
                        <input type="checkbox" checked={v.isActive} onChange={e => { const n = [...editForm.variants]; n[i].isActive = e.target.checked; setEditForm({ ...editForm, variants: n }); }} /> Active
                      </label>
                      <button type="button" className="btn-icon-danger" onClick={() => setEditForm({ ...editForm, variants: editForm.variants.filter((_, idx) => idx !== i) })}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary" onClick={() => setEditForm({ ...editForm, variants: [...editForm.variants, { label: '', price: '', mrp: '', stock: '', isActive: true }] })}>+ Add Variant</button>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Update Product'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {orderDetail && (
        <div className="modal-overlay" onClick={() => setOrderDetail(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order {orderDetail.orderNumber}</h3>
              <button className="btn-close" onClick={() => setOrderDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#6b7280' }}>Customer Details</h4>
                  <p style={{ margin: '4px 0' }}><strong>Name:</strong> {orderDetail.user?.name}</p>
                  <p style={{ margin: '4px 0' }}><strong>Phone:</strong> {orderDetail.shippingAddress?.phone}</p>
                  <p style={{ margin: '4px 0' }}><strong>Address:</strong><br />
                    {orderDetail.shippingAddress?.street},<br />
                    {orderDetail.shippingAddress?.city}, {orderDetail.shippingAddress?.zipCode}
                  </p>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#6b7280' }}>Order Info</h4>
                  <p style={{ margin: '4px 0' }}><strong>Date:</strong> {new Date(orderDetail.createdAt).toLocaleString()}</p>
                  <p style={{ margin: '4px 0' }}><strong>Status:</strong> <span className={`status-pill ${orderDetail.status?.toLowerCase()}`}>{orderDetail.status}</span></p>
                  <p style={{ margin: '4px 0' }}><strong>Payment:</strong> <span style={{ textTransform: 'capitalize' }}>{orderDetail.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span></p>
                  <p style={{ margin: '4px 0' }}><strong>Payment Status:</strong> <span className={`status-pill ${orderDetail.paymentStatus?.toLowerCase() === 'paid' ? 'delivered' : 'created'}`}>{orderDetail.paymentStatus}</span></p>
                </div>
              </div>

              <div className="modal-section">
                <h4 style={{ margin: '0 0 10px 0', color: '#6b7280' }}>Items</h4>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetail.items?.map((item, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: '500' }}>{item.name}</div>
                          {item.variantLabel && <div style={{ fontSize: '0.8rem', color: '#666' }}>{item.variantLabel}</div>}
                        </td>
                        <td>₹{item.price}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.subtotal || (item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-section" style={{ textAlign: 'right', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <p style={{ margin: '5px 0' }}>Subtotal: <strong>₹{orderDetail.totalAmount - (orderDetail.deliveryCharge || 0)}</strong></p>
                <p style={{ margin: '5px 0' }}>Delivery Charge: <strong>₹{orderDetail.deliveryCharge || 0}</strong></p>
                <p style={{ fontSize: '1.2rem', margin: '10px 0' }}>Total: <strong style={{ color: '#2c5530' }}>₹{orderDetail.totalAmount}</strong></p>
              </div>

              {orderDetail.shippingAddress?.latitude && (
                <button className="btn btn-outline" style={{ width: '100%', marginTop: '10px' }} onClick={() => setShowOrderMap(true)}>
                  🗺️ View Delivery Route
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <MapModal
        isOpen={showOrderMap}
        onClose={() => setShowOrderMap(false)}
        initialLocation={{ lat: orderDetail?.shippingAddress?.latitude, lng: orderDetail?.shippingAddress?.longitude }}
        shopLocation={{ lat: parseFloat(settings.storeLatitude), lng: parseFloat(settings.storeLongitude) }}
        viewOnly={true}
        title={`Route Visualization — ${orderDetail?.orderNumber}`}
      />
    </div>
  );
};

export default AdminPanel;

