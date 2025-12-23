import React, { useState, useEffect } from 'react';
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

  const categories = [
    'fruits', 'vegetables', 'dairy', 'meat', 'bakery', 
    'beverages', 'snacks', 'frozen', 'pantry', 'household'
  ];

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search && search !== filters.search) {
      setFilters(prev => ({ ...prev, search }));
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await api.get(`/api/products?${queryParams}`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>{t('products.title', 'Products')}</h1>
          <div className="products-search">
            <VoiceSearch onSearch={handleVoiceSearch} />
          </div>
        </div>

        <div className="products-content">
          {/* Filters Sidebar */}
          <aside className="filters-sidebar">
            <div className="filters-header">
              <h3>{t('products.filters.title', 'Filters')}</h3>
              <button onClick={clearFilters} className="clear-filters-btn">
                {t('products.filters.clear_all', 'Clear All')}
              </button>
            </div>

            <div className="filter-group">
              <label>{t('products.filters.search', 'Search')}</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={t('products.filters.search_ph', 'Search products...')}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>{t('products.filters.category', 'Category')}</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="filter-select"
              >
                <option value="">{t('products.filters.all_categories', 'All Categories')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>{t('products.filters.price_range', 'Price Range')}</label>
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
              <label>{t('products.filters.sort_by', 'Sort By')}</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="filter-select"
              >
                <option value="name">{t('products.filters.sort_name', 'Name')}</option>
                <option value="price">{t('products.filters.sort_price_asc', 'Price: Low to High')}</option>
                <option value="-price">{t('products.filters.sort_price_desc', 'Price: High to Low')}</option>
                <option value="category">{t('products.filters.sort_category', 'Category')}</option>
                <option value="-createdAt">{t('products.filters.sort_newest', 'Newest First')}</option>
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
