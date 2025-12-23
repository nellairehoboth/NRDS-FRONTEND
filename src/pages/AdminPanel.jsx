import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import './AdminPanel.css';
import { useI18n } from '../contexts/I18nContext';

const AdminPanel = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
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
    name: '',
    brand: '',
    barcode: '',
    description: '',
    price: '',
    mrp: '',
    gstRate: '',
    taxInclusive: true,
    category: 'fruits',
    stock: '',
    unit: 'kg',
    expiryDate: '',
    image: '',
    variants: [],
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    brand: '',
    barcode: '',
    description: '',
    price: '',
    mrp: '',
    gstRate: '',
    taxInclusive: true,
    category: 'fruits',
    stock: '',
    unit: 'kg',
    expiryDate: '',
    image: '',
    isActive: true,
    variants: [],
  });

  const normalizeVariants = (variants) => {
    if (!Array.isArray(variants)) return [];
    return variants
      .map((v) => {
        const label = String(v?.label || '').trim();
        const price = v?.price === '' || v?.price === null || v?.price === undefined ? '' : Number(v.price);
        const mrp = v?.mrp === '' || v?.mrp === null || v?.mrp === undefined ? '' : Number(v.mrp);
        const stock = v?.stock === '' || v?.stock === null || v?.stock === undefined ? '' : Number(v.stock);
        const isActive = v?.isActive !== undefined ? !!v.isActive : true;
        return { label, price, mrp, stock, isActive };
      });
  };

  // Friendly time formatter for notifications
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
      if (!notifRef.current) return;
      if (!notifRef.current.contains(e.target)) setNotifOpen(false);
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

  const quickConfirmOnline = async (order) => {
    try {
      if (!window.confirm('Confirm this online-paid order?')) return;
      await api.put(`/api/admin/orders/${order._id}`, { status: 'ADMIN_CONFIRMED' });
      await fetchOrders();
      alert('Order confirmed. You can now mark it Shipped then Delivered.');
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to confirm order';
      console.error('quickConfirmOnline error:', msg);
      alert(msg);
    }
  };

  const quickDeliverCOD = async (order) => {
    try {
      if (!window.confirm('Mark this COD order as Delivered? This will move through Confirmed → Shipped → Delivered.')) return;
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
      const chain = (() => {
        if (from === 'DELIVERED' || from === 'CANCELLED') return [];
        if (from === 'SHIPPED') return ['DELIVERED'];
        if (from === 'ADMIN_CONFIRMED') return ['SHIPPED', 'DELIVERED'];
        // CREATED, PAYMENT_PENDING, PAID or legacy early states
        return ['ADMIN_CONFIRMED', 'SHIPPED', 'DELIVERED'];
      })();
      for (const next of chain) {
        await api.put(`/api/admin/orders/${order._id}`, { status: next });
      }
      await fetchOrders();
      alert('Order marked Delivered.');
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to auto-deliver COD order';
      console.error('quickDeliverCOD error:', msg);
      alert(msg);
    }
  };

  const toValidVariants = (variants) => {
    if (!Array.isArray(variants)) return [];
    return (variants || [])
      .map((v) => {
        const label = String(v?.label || '').trim();
        const price = v?.price;
        const priceNum = price === '' || price === null || price === undefined ? NaN : Number(price);
        const mrp = v?.mrp === '' || v?.mrp === null || v?.mrp === undefined ? '' : Number(v.mrp);
        const stock = v?.stock === '' || v?.stock === null || v?.stock === undefined ? '' : Number(v.stock);
        if (!label && (price === '' || price === null || price === undefined)) return null;
        if (!label || !Number.isFinite(priceNum) || priceNum < 0) return { __invalid: true };
        return {
          label,
          price: priceNum,
          mrp: mrp === '' || mrp === null || mrp === undefined ? '' : Number(mrp),
          stock: stock === '' || stock === null || stock === undefined ? '' : Number(stock),
          isActive: v?.isActive !== false,
        };
      })
      .filter(Boolean);
  };

  const hasVariants = (v) => Array.isArray(v) && v.length > 0;

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
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
          .filter((o) => {
            const ts = new Date(o?.createdAt || 0).getTime();
            return ts > lastSeenOrderTs;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        if (alive) setUnseenOrders(newOnes);
      } catch (e) {
        // ignore polling errors
      }
    };

    poll();
    const id = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [lastSeenOrderTs]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/products');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build unique variant label options from the loaded products
  const variantLabelOptions = (() => {
    const set = new Set();
    (products || []).forEach((p) => {
      (p?.variants || []).forEach((v) => {
        const label = String(v?.label || '').trim();
        if (label) set.add(label);
      });
    });
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  })();

  const filteredProducts = (() => {
    const q = String(productSearch || '').trim().toLowerCase();
    const lowThreshold = 5;

    return (products || []).filter((p) => {
      const name = String(p?.name || '').toLowerCase();
      const category = String(p?.category || '').toLowerCase();
      const brand = String(p?.brand || '').toLowerCase();
      const barcode = String(p?.barcode || '').toLowerCase();
      const selectedVariant = (() => {
        if (variantLabelFilter === 'all') return null;
        return (p?.variants || []).find((v) => String(v?.label || '').trim() === variantLabelFilter) || null;
      })();
      const stock = (() => {
        if (selectedVariant) {
          const vStock = selectedVariant?.stock;
          return vStock === null || vStock === undefined ? 0 : Number(vStock);
        }
        return Number(p?.stock ?? 0);
      })();

      const matchesQuery =
        !q ||
        name.includes(q) ||
        category.includes(q) ||
        brand.includes(q) ||
        barcode.includes(q);
      const matchesCategory =
        productCategoryFilter === 'all' || category === String(productCategoryFilter).toLowerCase();
      const matchesVariant = (() => {
        if (variantLabelFilter === 'all') return true;
        return (p?.variants || []).some((v) => String(v?.label || '').trim() === variantLabelFilter);
      })();

      const matchesStock = (() => {
        if (productStockFilter === 'all') return true;
        if (productStockFilter === 'out') return stock <= 0;
        if (productStockFilter === 'low') return stock > 0 && stock <= lowThreshold;
        return true;
      })();

      return matchesQuery && matchesCategory && matchesVariant && matchesStock;
    });
  })();

  const openEdit = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || '',
      brand: product.brand || '',
      barcode: product.barcode || '',
      description: product.description || '',
      price: product.price || '',
      mrp: product.mrp || '',
      gstRate: product?.tax?.gstRate ?? '',
      taxInclusive: product?.tax?.inclusive !== false,
      category: product.category || 'fruits',
      stock: product.stock || '',
      unit: product.unit || 'kg',
      image: product.image || '',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : '',
      isActive: product.isActive !== false,
      variants: normalizeVariants(product?.variants || []),
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct?._id) return;
    try {
      setSavingEdit(true);

      const missing = [];
      if (!String(editForm.name || '').trim()) missing.push('Product Name');
      if (!String(editForm.description || '').trim()) missing.push('Description');
      if (!String(editForm.category || '').trim()) missing.push('Category');
      if (!String(editForm.unit || '').trim()) missing.push('Unit');

      if (hasVariants(editForm.variants)) {
        const mapped = toValidVariants(editForm.variants);
        const bad = mapped.find((v) => v?.__invalid);
        const hasAnyValid = mapped.some((v) => v && !v.__invalid);
        if (bad || !hasAnyValid) missing.push('Valid variants (label + price)');
      } else {
        const priceNum = editForm.price === '' || editForm.price === null || editForm.price === undefined ? NaN : Number(editForm.price);
        const stockNum = editForm.stock === '' || editForm.stock === null || editForm.stock === undefined ? NaN : Number(editForm.stock);
        if (!Number.isFinite(priceNum) || priceNum < 0) missing.push('Price');
        if (!Number.isFinite(stockNum) || stockNum < 0) missing.push('Stock');
      }

      if (missing.length) {
        alert('Please fill required fields: ' + missing.join(', '));
        return;
      }

      const payload = {
        name: editForm.name,
        brand: editForm.brand,
        barcode: editForm.barcode,
        description: editForm.description,
        price: editForm.price === '' ? '' : Number(editForm.price),
        mrp: editForm.mrp === '' ? '' : Number(editForm.mrp),
        tax: {
          gstRate: editForm.gstRate === '' ? 0 : Number(editForm.gstRate),
          hsn: '',
          inclusive: !!editForm.taxInclusive,
        },
        category: editForm.category,
        subcategory: '',
        stock: editForm.stock === '' ? '' : Number(editForm.stock),
        unit: editForm.unit,
        variants: toValidVariants(editForm.variants).filter((v) => v && !v.__invalid),
        packSize: undefined,
        expiryDate: editForm.expiryDate || null,
        supplier: undefined,
        image: editForm.image,
        images: [],
        tags: '',
        voiceTags: '',
        isActive: !!editForm.isActive,
      };
      await api.put(`/api/admin/products/${editingProduct._id}`, payload);
      alert('Product updated successfully');
      setEditingProduct(null);
      await fetchProducts();
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error('Error updating product:', error);
      if (status || data) console.error('Update product response:', status, data);
      const msg = data?.message || error?.message || 'Failed to update product';
      alert(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {

      const missing = [];
      if (!String(newProduct.name || '').trim()) missing.push('Product Name');
      if (!String(newProduct.description || '').trim()) missing.push('Description');
      if (!String(newProduct.category || '').trim()) missing.push('Category');
      if (!String(newProduct.unit || '').trim()) missing.push('Unit');

      if (hasVariants(newProduct.variants)) {
        const mapped = toValidVariants(newProduct.variants);
        const bad = mapped.find((v) => v?.__invalid);
        const hasAnyValid = mapped.some((v) => v && !v.__invalid);
        if (bad || !hasAnyValid) missing.push('Valid variants (label + price)');
      } else {
        const priceNum = newProduct.price === '' || newProduct.price === null || newProduct.price === undefined ? NaN : Number(newProduct.price);
        const stockNum = newProduct.stock === '' || newProduct.stock === null || newProduct.stock === undefined ? NaN : Number(newProduct.stock);
        if (!Number.isFinite(priceNum) || priceNum < 0) missing.push('Price');
        if (!Number.isFinite(stockNum) || stockNum < 0) missing.push('Stock');
      }

      if (missing.length) {
        alert('Please fill required fields: ' + missing.join(', '));
        return;
      }

      const payload = {
        name: newProduct.name,
        brand: newProduct.brand,
        barcode: newProduct.barcode,
        description: newProduct.description,
        price: newProduct.price === '' ? '' : Number(newProduct.price),
        mrp: newProduct.mrp === '' ? '' : Number(newProduct.mrp),
        tax: {
          gstRate: newProduct.gstRate === '' ? 0 : Number(newProduct.gstRate),
          hsn: '',
          inclusive: !!newProduct.taxInclusive,
        },
        category: newProduct.category,
        subcategory: '',
        stock: newProduct.stock === '' ? '' : Number(newProduct.stock),
        unit: newProduct.unit,
        variants: toValidVariants(newProduct.variants).filter((v) => v && !v.__invalid),
        packSize: undefined,
        expiryDate: newProduct.expiryDate || null,
        supplier: undefined,
        image: newProduct.image,
        images: [],
        tags: '',
        voiceTags: '',
      };

      await api.post('/api/admin/products', payload);
      setNewProduct({
        name: '',
        brand: '',
        barcode: '',
        description: '',
        price: '',
        mrp: '',
        gstRate: '',
        taxInclusive: true,
        category: 'fruits',
        stock: '',
        unit: 'kg',
        expiryDate: '',
        image: '',
        variants: [],
      });
      setShowAddProduct(false);
      fetchProducts();
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error('Error adding product:', error);
      if (status || data) console.error('Add product response:', status, data);
      const msg = data?.message || error?.message || 'Failed to add product';
      alert(msg);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/api/admin/orders/${orderId}`, { status });
      fetchOrders();
    } catch (error) {
      const statusCode = error?.response?.status;
      const msg = error?.response?.data?.message || error?.message || 'Failed to update order';
      console.error('Error updating order:', statusCode, msg);
      alert(msg);
    }
  };

  const markOrdersSeen = () => {
    const latestTs = unseenOrders.reduce((acc, o) => {
      const ts = new Date(o?.createdAt || 0).getTime();
      return ts > acc ? ts : acc;
    }, lastSeenOrderTs);
    const next = latestTs || Date.now();
    setLastSeenOrderTs(next);
    localStorage.setItem('admin_last_seen_order_ts', String(next));
    setHasInitializedLastSeen(true);
    setUnseenOrders([]);
  };

  return (
    <div className="admin-panel">
      <div className="container">
        <div className="admin-header-row">
          <h1>{t('admin.title', 'Admin Panel')}</h1>
          <div className="admin-notifications">
            <button
              type="button"
              className="admin-bell-btn"
              onClick={() => {
                setNotifOpen((v) => !v);
              }}
              aria-label={t('admin.notifications', 'Notifications')}
              title={t('admin.notifications', 'Notifications')}
            >
              <span className="admin-bell-icon">🔔</span>
              {unseenOrders.length > 0 && (
                <span className="admin-bell-badge">{unseenOrders.length}</span>
              )}
            </button>

            {notifOpen && (
              <div className="admin-notif-dropdown" ref={notifRef}>
                <div className="admin-notif-title">
                  <span>{t('admin.new_orders', 'New Orders')}</span>
                  <button
                    type="button"
                    className="admin-notif-mark"
                    onClick={() => markOrdersSeen()}
                    disabled={unseenOrders.length === 0}
                  >
                    {t('admin.mark_all_read', 'Mark all read')}
                  </button>
                </div>
                {unseenOrders.length === 0 ? (
                  <div className="admin-notif-empty">{t('admin.no_new_orders', 'No new orders')}</div>
                ) : (
                  <div className="admin-notif-list">
                    {unseenOrders.map((o) => (
                      <button
                        key={o._id}
                        type="button"
                        className="admin-notif-item"
                        onClick={() => {
                          setActiveTab('orders');
                          setNotifOpen(false);
                        }}
                      >
                        <div className="admin-notif-row">
                          <div className="admin-notif-order">{o.orderNumber}</div>
                          <div className={`status-pill ${String(o.status).toLowerCase()}`}>{o.status}</div>
                        </div>
                        <div className="admin-notif-meta">
                          <span>₹{o.totalAmount}</span>
                          <span className="muted">{o.user?.name || '—'}</span>
                          <span>{timeAgo(o.createdAt)}</span>
                        </div>
                      </button>
                    ))}
                    <div className="admin-notif-footer">
                      <button
                        type="button"
                        className="admin-notif-viewall"
                        onClick={() => { setActiveTab('orders'); setNotifOpen(false); }}
                      >
                        {t('admin.view_orders', 'View Orders')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="admin-tabs">
          <button 
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            {t('admin.tabs.products', 'Products')}
          </button>
          <button 
            className={activeTab === 'orders' ? 'active' : ''}
            onClick={() => setActiveTab('orders')}
          >
            {t('admin.tabs.orders', 'Orders')}
          </button>
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
              <div className="add-product-form" style={{marginTop: 12}}>
                <h3>Edit Product</h3>
                <form onSubmit={handleUpdateProduct}>
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Brand"
                      value={editForm.brand}
                      onChange={(e) => setEditForm({...editForm, brand: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="Barcode"
                      value={editForm.barcode}
                      onChange={(e) => setEditForm({...editForm, barcode: e.target.value})}
                    />
                    {!hasVariants(editForm.variants) && (
                      <>
                        <input
                          type="number"
                          placeholder="Price"
                          value={editForm.price}
                          onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                          required
                        />
                        <input
                          type="number"
                          placeholder="MRP"
                          value={editForm.mrp}
                          onChange={(e) => setEditForm({...editForm, mrp: e.target.value})}
                        />
                      </>
                    )}
                    <input
                      type="number"
                      placeholder="GST %"
                      value={editForm.gstRate}
                      onChange={(e) => setEditForm({...editForm, gstRate: e.target.value})}
                    />
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({...editForm, category: e.target.value})}
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
                        onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                        required
                      />
                    )}
                    <select
                      value={editForm.unit}
                      onChange={(e) => setEditForm({...editForm, unit: e.target.value})}
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
                      onChange={(e) => setEditForm({...editForm, expiryDate: e.target.value})}
                    />
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={editForm.image}
                      onChange={(e) => setEditForm({...editForm, image: e.target.value})}
                    />
                    <label style={{display:'flex',alignItems:'center',gap:8}}>
                      <input
                        type="checkbox"
                        checked={!!editForm.isActive}
                        onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                      />
                      Active
                    </label>
                    <label style={{display:'flex',alignItems:'center',gap:8}}>
                      <input
                        type="checkbox"
                        checked={!!editForm.taxInclusive}
                        onChange={(e) => setEditForm({...editForm, taxInclusive: e.target.checked})}
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
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
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
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Brand"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="Barcode"
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                    />
                    {!hasVariants(newProduct.variants) && (
                      <>
                        <input
                          type="number"
                          placeholder="Price"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                          required
                        />
                        <input
                          type="number"
                          placeholder="MRP"
                          value={newProduct.mrp}
                          onChange={(e) => setNewProduct({...newProduct, mrp: e.target.value})}
                        />
                      </>
                    )}
                    <input
                      type="number"
                      placeholder="GST %"
                      value={newProduct.gstRate}
                      onChange={(e) => setNewProduct({...newProduct, gstRate: e.target.value})}
                    />
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
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
                        onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                        required
                      />
                    )}
                    <select
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
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
                      onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                    />
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                    />
                    <label style={{display:'flex',alignItems:'center',gap:8}}>
                      <input
                        type="checkbox"
                        checked={!!newProduct.taxInclusive}
                        onChange={(e) => setNewProduct({...newProduct, taxInclusive: e.target.checked})}
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
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
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
              {loading ? (
                <div>Loading products...</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
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
                          <button className="btn" onClick={() => openEdit(product)}>Edit</button>
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-management">
            <h2>Orders Management</h2>
            {loading ? (
              <div>Loading orders...</div>
            ) : (
              <div className="orders-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
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
                          <div style={{display:'flex', gap:8, alignItems:'center'}}>
                            <button className="btn btn-sm" onClick={() => setOrderDetail(order)}>View Details</button>
                            {String(order?.paymentMethod).toLowerCase() === 'cod' && !['DELIVERED','CANCELLED','cancelled'].includes(String(order?.status)) && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => quickDeliverCOD(order)}
                                title="Confirm → Ship → Deliver"
                              >
                                Deliver (COD)
                              </button>
                            )}
                            {String(order?.paymentMethod).toLowerCase() !== 'cod' && (String(order?.status) === 'PAID') && (
                              <button
                                type="button"
                                className="btn btn-sm"
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
            )}
          </div>
        )}
      </div>

      {orderDetail && (
        <div className="modal-overlay" onClick={() => setOrderDetail(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{margin:0}}>Order Details — {orderDetail.orderNumber}</h3>
              <button className="modal-close" onClick={() => setOrderDetail(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <div className="modal-grid">
                  <div><strong>Status:</strong><div>{orderDetail.status}</div></div>
                  <div><strong>Total:</strong><div>₹{orderDetail.totalAmount}</div></div>
                  <div><strong>Payment Method:</strong><div>{orderDetail.paymentMethod}</div></div>
                  <div><strong>Payment Status:</strong><div>{orderDetail.paymentStatus}</div></div>
                  {orderDetail.paymentId && (<div><strong>Payment ID:</strong><div>{orderDetail.paymentId}</div></div>)}
                  {orderDetail.paymentGatewayOrderId && (<div><strong>Gateway Order ID:</strong><div>{orderDetail.paymentGatewayOrderId}</div></div>)}
                  <div><strong>Date:</strong><div>{new Date(orderDetail.createdAt).toLocaleString()}</div></div>
                  <div><strong>Customer:</strong><div>{orderDetail.user?.name || '—'}</div></div>
                </div>
              </div>

              <div className="modal-section">
                <h4 style={{margin:'8px 0'}}>Shipping Address</h4>
                <div style={{color:'#374151'}}>
                  <div>{orderDetail.shippingAddress?.name}</div>
                  <div>{orderDetail.shippingAddress?.street}</div>
                  <div>{orderDetail.shippingAddress?.city}, {orderDetail.shippingAddress?.state} {orderDetail.shippingAddress?.zipCode}</div>
                  <div>{orderDetail.shippingAddress?.country}</div>
                  <div>{orderDetail.shippingAddress?.phone}</div>
                </div>
              </div>

              <div className="modal-section">
                <h4 style={{margin:'8px 0'}}>Items</h4>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Variant</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orderDetail.items || []).map((it, i) => (
                      <tr key={i}>
                        <td>{it.name || it.product?.name}</td>
                        <td>{it.variantLabel || '—'}</td>
                        <td>{it.quantity}</td>
                        <td>₹{it.price}</td>
                        <td>₹{it.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={4} style={{textAlign:'right'}}>Total</th>
                      <th>₹{orderDetail.totalAmount}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
