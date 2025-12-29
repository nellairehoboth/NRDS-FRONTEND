import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import './AdminPanel.css';
import { useI18n } from '../contexts/I18nContext';
import { SHOP_LOCATION } from '../config';
import MapModal from '../components/MapModal';
import { sanitizeImageUrl, handleImageError } from '../utils/imageUtils';

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
    setSettings({ ...settings, storeLatitude: loc.lat || SHOP_LOCATION.lat, storeLongitude: loc.lng || SHOP_LOCATION.lng });
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
      const response = await api.get(`/api/maps/search?q=${encodeURIComponent(addressSearch)}`);
      const data = response.data;
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

        // Track both new orders and status updates using updatedAt
        const interestingOnes = all
          .filter(o => {
            const upTs = new Date(o?.updatedAt || 0).getTime();
            return upTs > lastSeenOrderTs;
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10);

        if (alive) setUnseenOrders(interestingOnes);
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
      const variants = toValidVariants(editForm.variants);
      if (variants.length === 0 && (!editForm.price || editForm.price <= 0)) {
        return alert('Please provide either a base price or add variants with prices.');
      }
      const payload = { ...editForm, variants };
      await api.put(`/api/admin/products/${editingProduct._id}`, payload);
      setEditingProduct(null);
      fetchProducts();
    } catch (e) { alert(e.response?.data?.message || 'Failed to update product'); }
    finally { setSavingEdit(false); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const variants = toValidVariants(newProduct.variants);
      if (variants.length === 0 && (!newProduct.price || newProduct.price <= 0)) {
        return alert('Please provide either a base price or add variants with prices.');
      }
      const payload = { ...newProduct, variants };
      await api.post('/api/admin/products', payload);
      setShowAddProduct(false);
      setNewProduct({ name: '', brand: '', barcode: '', description: '', price: '', mrp: '', gstRate: '', taxInclusive: true, category: 'fruits', stock: '', unit: 'kg', expiryDate: '', image: '', variants: [] });
      fetchProducts();
    } catch (e) { alert(e.response?.data?.message || 'Failed to add product'); }
  };

  const markOrdersSeen = () => {
    const latestTs = unseenOrders.reduce((acc, o) => Math.max(acc, new Date(o.updatedAt).getTime()), lastSeenOrderTs);
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

  const hasVariants = (vars) => Array.isArray(vars) && vars.length > 0;
  const variantLabelOptions = ['all', ...new Set(products.flatMap(p => (p.variants || []).map(v => String(v.label || '').trim())).filter(l => l !== ''))];
  const openEdit = (product) => {
    setEditingProduct(product);
    setEditForm({
      ...product,
      variants: product.variants || [],
      taxInclusive: product.taxInclusive ?? true
    });
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
            {loading && <span style={{ marginLeft: '10px', fontSize: '14px', color: '#666' }}>Refreshing...</span>}
            {notifOpen && (
              <div className="admin-notif-dropdown" ref={notifRef}>
                <div className="admin-notif-title">
                  <span>New Orders</span>
                  <button className="admin-notif-mark" onClick={markOrdersSeen}>Mark Read</button>
                </div>
                <div className="admin-notif-list">
                  {unseenOrders.length === 0 ? (
                    <div className="admin-notif-empty">No new notifications</div>
                  ) : (
                    unseenOrders.map(o => (
                      <div key={o._id} className="admin-notif-item">
                        <div className="admin-notif-header">
                          <span className="admin-notif-user">{o.user?.name || 'Unknown User'}</span>
                          <span className={`status-pill ${o.status?.toLowerCase()}`}>{o.status}</span>
                        </div>
                        <div className="admin-notif-body">
                          {o.orderNumber} - ₹{o.totalAmount}
                        </div>
                        <small className="admin-notif-time">{timeAgo(o.updatedAt)}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-tabs">
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>{t('admin.tabs.products', 'Products')}</button>
          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>{t('admin.tabs.orders', 'Orders')}</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>{t('admin.tabs.settings', 'Settings')}</button>
        </div>

        {activeTab === 'products' && (
          <div className="products-management">
            <div className="section-header">
              <h2>{t('admin.products_mgmt', 'Products Management')}</h2>
              {!editingProduct && (
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="btn btn-primary"
                >
                  {t('admin.add_product', 'Add Product')}
                </button>
              )}
            </div>

            {!editingProduct && (
              <div className="admin-product-filters">
                <div className="admin-filter-row">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={t('admin.search_ph', 'Search product name or category...')}
                    className="admin-filter-input"
                  />
                  <select
                    value={variantLabelFilter}
                    onChange={(e) => setVariantLabelFilter(e.target.value)}
                    className="admin-filter-select"
                  >
                    {variantLabelOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === 'all' ? t('admin.all_variants', 'All Variants') : opt}
                      </option>
                    ))}
                  </select>
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="admin-filter-select"
                  >
                    <option value="all">{t('admin.all_categories', 'All Categories')}</option>
                    <option value="fruits">Fruits</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                    <option value="bakery">Bakery</option>
                    <option value="beverages">Beverages</option>
                    <option value="snacks">Snacks</option>
                    <option value="frozen">Frozen</option>
                    <option value="pantry">Pantry</option>
                    <option value="household">Household</option>
                  </select>
                  <select
                    value={productStockFilter}
                    onChange={(e) => setProductStockFilter(e.target.value)}
                    className="admin-filter-select"
                  >
                    <option value="all">{t('admin.all_stock', 'All Stock')}</option>
                    <option value="low">{t('admin.low_stock', 'Low Stock (≤ 5)')}</option>
                    <option value="out">{t('admin.out_of_stock', 'Out of Stock')}</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setProductSearch('');
                      setVariantLabelFilter('all');
                      setProductCategoryFilter('all');
                      setProductStockFilter('all');
                    }}
                  >
                    {t('admin.clear', 'Clear')}
                  </button>
                </div>
                <div className="admin-filter-meta">
                  Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong>
                </div>
              </div>
            )}

            {editingProduct && (
              <div className="add-product-form" style={{ marginTop: 12 }}>
                <h3>Edit Product</h3>
                <form onSubmit={handleUpdateProduct}>
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Brand"
                      value={editForm.brand}
                      onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Barcode"
                      value={editForm.barcode}
                      onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                    />
                    {!hasVariants(editForm.variants) && (
                      <>
                        <input
                          type="number"
                          placeholder="Price"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          required
                        />
                        <input
                          type="number"
                          placeholder="MRP"
                          value={editForm.mrp}
                          onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                        />
                      </>
                    )}
                    <input
                      type="number"
                      placeholder="GST %"
                      value={editForm.gstRate}
                      onChange={(e) => setEditForm({ ...editForm, gstRate: e.target.value })}
                    />
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    >
                      <option value="fruits">Fruits</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="dairy">Dairy</option>
                      <option value="meat">Meat</option>
                      <option value="bakery">Bakery</option>
                      <option value="beverages">Beverages</option>
                      <option value="snacks">Snacks</option>
                      <option value="frozen">Frozen</option>
                      <option value="pantry">Pantry</option>
                      <option value="household">Household</option>
                    </select>
                    {!hasVariants(editForm.variants) && (
                      <input
                        type="number"
                        placeholder="Stock"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                        required
                      />
                    )}
                    <select
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="piece">piece</option>
                      <option value="liter">liter</option>
                      <option value="ml">ml</option>
                      <option value="pack">pack</option>
                      <option value="dozen">dozen</option>
                    </select>
                    <input
                      type="date"
                      placeholder="Expiry Date"
                      value={editForm.expiryDate}
                      onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    />
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={editForm.image}
                      onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      />
                      Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!editForm.taxInclusive}
                        onChange={(e) => setEditForm({ ...editForm, taxInclusive: e.target.checked })}
                      />
                      Tax Inclusive
                    </label>
                  </div>

                  <div className="variants-section">
                    <div className="variants-header">
                      <strong>Variants (Weight-wise pricing)</strong>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          const next = [...(editForm.variants || [])];
                          next.push({ label: '', price: '', mrp: '', stock: '', isActive: true });
                          setEditForm({ ...editForm, variants: next });
                        }}
                      >
                        + Add Variant
                      </button>
                    </div>

                    {(editForm.variants || []).length === 0 ? (
                      <div className="variants-hint">No variants. Uses base price.</div>
                    ) : (
                      <div className="variants-list">
                        {(editForm.variants || []).map((v, idx) => (
                          <div key={idx} className="variant-row">
                            <input
                              type="text"
                              placeholder="Label (e.g., 250g)"
                              value={v.label}
                              onChange={(e) => {
                                const next = [...(editForm.variants || [])];
                                next[idx] = { ...next[idx], label: e.target.value };
                                setEditForm({ ...editForm, variants: next });
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              value={v.price}
                              onChange={(e) => {
                                const next = [...(editForm.variants || [])];
                                next[idx] = { ...next[idx], price: e.target.value };
                                setEditForm({ ...editForm, variants: next });
                              }}
                            />
                            <input
                              type="number"
                              placeholder="MRP"
                              value={v.mrp}
                              onChange={(e) => {
                                const next = [...(editForm.variants || [])];
                                next[idx] = { ...next[idx], mrp: e.target.value };
                                setEditForm({ ...editForm, variants: next });
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Stock"
                              value={v.stock}
                              onChange={(e) => {
                                const next = [...(editForm.variants || [])];
                                next[idx] = { ...next[idx], stock: e.target.value };
                                setEditForm({ ...editForm, variants: next });
                              }}
                            />
                            <label className="variant-active">
                              <input
                                type="checkbox"
                                checked={v.isActive !== false}
                                onChange={(e) => {
                                  const next = [...(editForm.variants || [])];
                                  next[idx] = { ...next[idx], isActive: e.target.checked };
                                  setEditForm({ ...editForm, variants: next });
                                }}
                              />
                              Active
                            </label>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                const next = [...(editForm.variants || [])];
                                next.splice(idx, 1);
                                setEditForm({ ...editForm, variants: next });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <textarea
                    placeholder="Description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    required
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showAddProduct && (
              <div className="add-product-form">
                <h3>Add New Product</h3>
                <form onSubmit={handleAddProduct}>
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Brand"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Barcode"
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    />
                    {!hasVariants(newProduct.variants) && (
                      <>
                        <input
                          type="number"
                          placeholder="Price"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                          required
                        />
                        <input
                          type="number"
                          placeholder="MRP"
                          value={newProduct.mrp}
                          onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                        />
                      </>
                    )}
                    <input
                      type="number"
                      placeholder="GST %"
                      value={newProduct.gstRate}
                      onChange={(e) => setNewProduct({ ...newProduct, gstRate: e.target.value })}
                    />
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    >
                      <option value="fruits">Fruits</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="dairy">Dairy</option>
                      <option value="meat">Meat</option>
                      <option value="bakery">Bakery</option>
                      <option value="beverages">Beverages</option>
                      <option value="snacks">Snacks</option>
                      <option value="frozen">Frozen</option>
                      <option value="pantry">Pantry</option>
                      <option value="household">Household</option>
                    </select>
                    {!hasVariants(newProduct.variants) && (
                      <input
                        type="number"
                        placeholder="Stock"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        required
                      />
                    )}
                    <select
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="piece">piece</option>
                      <option value="liter">liter</option>
                      <option value="ml">ml</option>
                      <option value="pack">pack</option>
                      <option value="dozen">dozen</option>
                    </select>
                    <input
                      type="date"
                      placeholder="Expiry Date"
                      value={newProduct.expiryDate}
                      onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                    />
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!newProduct.taxInclusive}
                        onChange={(e) => setNewProduct({ ...newProduct, taxInclusive: e.target.checked })}
                      />
                      Tax Inclusive
                    </label>
                  </div>

                  <div className="variants-section">
                    <div className="variants-header">
                      <strong>Variants (Weight-wise pricing)</strong>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          const next = [...(newProduct.variants || [])];
                          next.push({ label: '', price: '', mrp: '', stock: '', isActive: true });
                          setNewProduct({ ...newProduct, variants: next });
                        }}
                      >
                        + Add Variant
                      </button>
                    </div>

                    {(newProduct.variants || []).length === 0 ? (
                      <div className="variants-hint">No variants. Uses base price.</div>
                    ) : (
                      <div className="variants-list">
                        {(newProduct.variants || []).map((v, idx) => (
                          <div key={idx} className="variant-row">
                            <input
                              type="text"
                              placeholder="Label (e.g., 250g)"
                              value={v.label}
                              onChange={(e) => {
                                const next = [...(newProduct.variants || [])];
                                next[idx] = { ...next[idx], label: e.target.value };
                                setNewProduct({ ...newProduct, variants: next });
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              value={v.price}
                              onChange={(e) => {
                                const next = [...(newProduct.variants || [])];
                                next[idx] = { ...next[idx], price: e.target.value };
                                setNewProduct({ ...newProduct, variants: next });
                              }}
                            />
                            <input
                              type="number"
                              placeholder="MRP"
                              value={v.mrp}
                              onChange={(e) => {
                                const next = [...(newProduct.variants || [])];
                                next[idx] = { ...next[idx], mrp: e.target.value };
                                setNewProduct({ ...newProduct, variants: next });
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Stock"
                              value={v.stock}
                              onChange={(e) => {
                                const next = [...(newProduct.variants || [])];
                                next[idx] = { ...next[idx], stock: e.target.value };
                                setNewProduct({ ...newProduct, variants: next });
                              }}
                            />
                            <label className="variant-active">
                              <input
                                type="checkbox"
                                checked={v.isActive !== false}
                                onChange={(e) => {
                                  const next = [...(newProduct.variants || [])];
                                  next[idx] = { ...next[idx], isActive: e.target.checked };
                                  setNewProduct({ ...newProduct, variants: next });
                                }}
                              />
                              Active
                            </label>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                const next = [...(newProduct.variants || [])];
                                next.splice(idx, 1);
                                setNewProduct({ ...newProduct, variants: next });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <textarea
                    placeholder="Description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    required
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Add Product</button>
                    <button
                      type="button"
                      onClick={() => setShowAddProduct(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="products-table">
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const selectedVariant = (() => {
                      if (variantLabelFilter === 'all') return null;
                      return (product?.variants || []).find((v) => String(v?.label || '').trim() === variantLabelFilter) || null;
                    })();
                    const displayPrice = (() => {
                      if (selectedVariant) {
                        const p = selectedVariant?.price;
                        return Number.isFinite(Number(p)) ? `₹${Number(p)}` : '—';
                      }
                      return `₹${product.price}`;
                    })();
                    const displayStock = (() => {
                      if (selectedVariant) {
                        const s = selectedVariant?.stock;
                        if (s === null || s === undefined) return '—';
                        return `${s} ${product.unit}`;
                      }
                      return `${product.stock} ${product.unit}`;
                    })();
                    const isOut = (() => {
                      if (selectedVariant) {
                        const s = selectedVariant?.stock;
                        const n = s === null || s === undefined ? 0 : Number(s);
                        return !(n > 0);
                      }
                      return !(Number(product?.stock ?? 0) > 0);
                    })();

                    return (
                      <tr key={product._id}>
                        <td>{product.name}</td>
                        <td>
                          <img
                            src={sanitizeImageUrl(product.image)}
                            alt={product.name}
                            onError={(e) => handleImageError(e)}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        </td>
                        <td>{product.category}</td>
                        <td>{displayPrice}</td>
                        <td>
                          {displayStock}
                          {isOut && (
                            <span style={{ marginLeft: 6, color: '#b00020', fontSize: 12 }}>(Out)</span>
                          )}
                        </td>
                        <td>
                          <span className={`status ${product.isActive ? 'active' : 'inactive'}`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn" onClick={() => openEdit(product)}>Edit</button>
                            <button className="btn btn-secondary" onClick={() => handleDeleteProduct(product._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.user?.name}</td>
                      <td>₹{order.totalAmount}</td>
                      <td>
                        {(() => {
                          const normalizeLegacy = (s) => {
                            const map = {
                              pending: 'CREATED',
                              confirmed: 'ADMIN_CONFIRMED',
                              processing: 'ADMIN_CONFIRMED',
                              shipped: 'SHIPPED',
                              delivered: 'DELIVERED',
                              cancelled: 'CANCELLED',
                            };
                            return map[s] || s;
                          };
                          const from = normalizeLegacy(order.status);
                          const allowedNext = {
                            CREATED: ['ADMIN_CONFIRMED', 'CANCELLED'],
                            PAYMENT_PENDING: ['ADMIN_CONFIRMED', 'CANCELLED'],
                            PAID: ['ADMIN_CONFIRMED', 'CANCELLED'],
                            ADMIN_CONFIRMED: ['SHIPPED', 'CANCELLED'],
                            SHIPPED: ['DELIVERED'],
                            DELIVERED: [],
                            CANCELLED: [],
                          };
                          const valueMap = {
                            CREATED: 'ADMIN_CONFIRMED',
                            PAYMENT_PENDING: 'ADMIN_CONFIRMED',
                            PAID: 'ADMIN_CONFIRMED',
                            ADMIN_CONFIRMED: 'ADMIN_CONFIRMED',
                            SHIPPED: 'SHIPPED',
                            DELIVERED: 'DELIVERED',
                            CANCELLED: 'CANCELLED',
                          };
                          const currentValue = valueMap[from] || 'ADMIN_CONFIRMED';
                          const allowed = new Set([currentValue, ...(allowedNext[from] || [])]);
                          const handleChange = (e) => updateOrderStatus(order._id, e.target.value);
                          return (
                            <select value={currentValue} onChange={handleChange}>
                              <option value="ADMIN_CONFIRMED" disabled={!allowed.has('ADMIN_CONFIRMED')}>Confirmed</option>
                              <option value="SHIPPED" disabled={!allowed.has('SHIPPED')}>Shipped</option>
                              <option value="DELIVERED" disabled={!allowed.has('DELIVERED')}>Delivered</option>
                              <option value="CANCELLED" disabled={!allowed.has('CANCELLED')}>Cancelled</option>
                            </select>
                          );
                        })()}
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className="btn-sm btn-outline" onClick={() => setOrderDetail(order)}>View Details</button>
                          {String(order?.paymentMethod).toLowerCase() === 'cod' && !['DELIVERED', 'CANCELLED', 'cancelled'].includes(String(order?.status)) && (
                            <button
                              type="button"
                              className="btn-sm btn-primary"
                              onClick={() => quickDeliverCOD(order)}
                              title="Confirm → Ship → Deliver"
                            >
                              Deliver (COD)
                            </button>
                          )}
                          {(String(order?.paymentMethod).toLowerCase() !== 'cod') && (String(order?.status) === 'PAID') && (
                            <button
                              type="button"
                              className="btn-sm btn-edit"
                              onClick={() => quickConfirmOnline(order)}
                              title="Confirm paid order"
                            >
                              Confirm (Online)
                            </button>
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
              <div className="settings-card">
                <div className="form-group">
                  <label>Max Delivery Distance (KM)</label>
                  <input type="number" className="form-control" value={settings.maxDeliveryDistance} onChange={e => setSettings({ ...settings, maxDeliveryDistance: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Free Delivery Threshold (₹)</label>
                  <input type="number" className="form-control" value={settings.freeDeliveryThreshold} onChange={e => setSettings({ ...settings, freeDeliveryThreshold: e.target.value })} />
                </div>

                <div className="settings-section">
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


                <div className="settings-section">
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
        {/* Add Product Modal */}
        {
          showAddProduct && (
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
                      <input type="number" placeholder="Price (₹)" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} required={newProduct.variants.length === 0} />
                      <input type="number" placeholder="MRP (₹)" value={newProduct.mrp} onChange={e => setNewProduct({ ...newProduct, mrp: e.target.value })} />
                      <input type="number" placeholder="Stock" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} required={newProduct.variants.length === 0} />
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
          )
        }

        {/* Edit Product Modal */}
        {
          editingProduct && (
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
                      <input type="number" placeholder="Price (₹)" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} required={editForm.variants.length === 0} />
                      <input type="number" placeholder="MRP (₹)" value={editForm.mrp} onChange={e => setEditForm({ ...editForm, mrp: e.target.value })} />
                      <input type="number" placeholder="Stock" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} required={editForm.variants.length === 0} />
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
          )
        }

        {
          orderDetail && (
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
          )
        }

        <MapModal
          isOpen={showOrderMap}
          onClose={() => setShowOrderMap(false)}
          initialLocation={{ lat: orderDetail?.shippingAddress?.latitude, lng: orderDetail?.shippingAddress?.longitude }}
          shopLocation={{ lat: parseFloat(settings.storeLatitude), lng: parseFloat(settings.storeLongitude) }}
          viewOnly={true}
          title={`Route Visualization — ${orderDetail?.orderNumber}`}
        />
      </div>
    </div>
  );
};

export default AdminPanel;

