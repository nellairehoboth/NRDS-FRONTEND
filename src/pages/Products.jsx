import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import VoiceSearch from '../components/VoiceSearch';
import api from '../api/axios';
import './Products.css';
import { useI18n } from '../contexts/I18nContext';

const Products = () => {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'name'
  });

  const [categories, setCategories] = useState([]);

  /* Custom Category Search State */
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Sync local search input with filter when filter changes externally (e.g. URL)
  useEffect(() => {
    if (filters.category !== categorySearch && !isCategoryOpen) {
      setCategorySearch(filters.category || '');
    }
  }, [filters.category]);

  const filteredCategories = categories.filter(c =>
    c.toLowerCase().includes((categorySearch || '').toLowerCase())
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/api/products/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      // Explicitly set a high limit if not provided
      if (!queryParams.has('limit')) queryParams.append('limit', '1000');

      const response = await api.get(`/api/products?${queryParams}`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProducts();
  }, [filters, fetchProducts]);

  useEffect(() => {
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    if (search !== filters.search || category !== filters.category) {
      setFilters(prev => ({ ...prev, search, category }));
    }
  }, [searchParams, filters.search, filters.category]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v);
    });
    setSearchParams(newSearchParams);
  };

  const handleVoiceSearch = (searchTerm) => {
    handleFilterChange('search', searchTerm);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'name'
    });
    setSearchParams({});
  };

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <div className="title-section">
            <h1>{t('products.title', 'Products')}</h1>
            <button
              className="mobile-filter-toggle"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              {showMobileFilters ? '✕' : '🔍 ' + t('products.filters.title', 'Filters')}
            </button>
          </div>
          <div className="products-search">
            <VoiceSearch onSearch={handleVoiceSearch} />
          </div>
        </div>

        <div className="products-content">
          {/* Mobile Overlay */}
          {showMobileFilters && (
            <div
              className="filters-overlay"
              onClick={() => setShowMobileFilters(false)}
            ></div>
          )}

          {/* Filters Sidebar */}
          <aside className={`filters-sidebar ${showMobileFilters ? 'show' : ''}`}>
            <div className="filters-header">
              <h3>{t('products.filters.title', 'Filters')}</h3>
              <button
                onClick={() => {
                  clearFilters();
                  setShowMobileFilters(false);
                }}
                className="clear-filters-btn"
              >
                {t('products.filters.clear_all', 'Clear All')}
              </button>
            </div>

            <div className="filter-group">
              <label>🔍 {t('products.filters.search', 'Search')}</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={t('products.filters.search_ph', 'Search products...')}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>📂 {t('products.filters.category', 'Category')}</label>
              <div className="custom-select-wrapper" onBlur={(e) => {
                // Close dropdown if click outside
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsCategoryOpen(false);
                  // Reset search to selected value if no new selection made
                  if (categorySearch !== filters.category) {
                    setCategorySearch(filters.category || '');
                  }
                }
              }}>
                <input
                  type="text"
                  value={categorySearch}
                  onFocus={() => setIsCategoryOpen(true)}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setIsCategoryOpen(true);
                    if (e.target.value === '') handleFilterChange('category', '');
                  }}
                  placeholder={t('products.filters.all_categories', 'Type or Select Category')}
                  className="filter-input"
                />
                {isCategoryOpen && (
                  <ul className="custom-dropdown-list">
                    <li
                      className={`dropdown-item ${filters.category === '' ? 'selected' : ''}`}
                      onMouseDown={() => {
                        handleFilterChange('category', '');
                        setCategorySearch('');
                        setIsCategoryOpen(false);
                      }}
                    >
                      {t('products.filters.all_categories', 'All Categories')}
                    </li>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(category => (
                        <li
                          key={category}
                          className={`dropdown-item ${filters.category === category ? 'selected' : ''}`}
                          onMouseDown={() => {
                            handleFilterChange('category', category);
                            setCategorySearch(category);
                            setIsCategoryOpen(false);
                          }}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </li>
                      ))
                    ) : (
                      <li className="dropdown-item no-results">No matches found</li>
                    )}
                  </ul>
                )}
                {/* Arrow Icon */}
                <span className="custom-select-arrow">▼</span>
              </div>
            </div>

            <div className="filter-group">
              <label>💰 {t('products.filters.price_range', 'Price Range')}</label>
              <div className="price-inputs">
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder={t('products.filters.min', 'Min')}
                  className="filter-input price-input"
                />
                <span>{t('products.filters.to', 'to')}</span>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder={t('products.filters.max', 'Max')}
                  className="filter-input price-input"
                />
              </div>
            </div>

            <div className="filter-group">
              <label>🔃 {t('products.filters.sort_by', 'Sort By')}</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="filter-select"
              >
                <option value="name">🔤 {t('products.filters.sort_name', 'Name')}</option>
                <option value="price">📉 {t('products.filters.sort_price_asc', 'Price: Low to High')}</option>
                <option value="-price">📈 {t('products.filters.sort_price_desc', 'Price: High to Low')}</option>
                <option value="category">🏷️ {t('products.filters.sort_category', 'Category')}</option>
                <option value="-createdAt">✨ {t('products.filters.sort_newest', 'Newest First')}</option>
              </select>
            </div>

          </aside>

          {/* Products Grid */}
          <main className="products-main">
            <div className="products-info">
              <p>{products.length} {t('products.found', 'products found')}</p>
            </div>

            {loading ? (
              <div className="products-loading">
                <div className="loading-grid">
                  {[...Array(12)].map((_, index) => (
                    <div key={index} className="product-skeleton"></div>
                  ))}
                </div>
              </div>
            ) : products.length > 0 ? (
              <div className="products-grid">
                {products.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="no-products">
                <h3>{t('products.none_title', 'No products found')}</h3>
                <p>{t('products.none_text', 'Try adjusting your search or filters')}</p>
                <button onClick={clearFilters} className="btn btn-primary">
                  {t('products.filters.clear_filters', 'Clear Filters')}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Products;
