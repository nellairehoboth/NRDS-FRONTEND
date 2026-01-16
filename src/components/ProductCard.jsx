import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import api from '../api/axios';
import { sanitizeImageUrl, handleImageError } from '../utils/imageUtils';
import './ProductCard.css';

const ProductCard = ({ product, onDelete }) => {
  const { addToCart } = useCart();
  const { isAuthenticated, isAdmin } = useAuth();
  const { lang } = useI18n();
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quantity, setQuantity] = useState('1'); // Use string to allow empty state while typing

  const [selectedVariantId, setSelectedVariantId] = useState(() => {
    const active = Array.isArray(product?.variants) ? product.variants.filter(v => v && v.isActive !== false) : [];
    return active.length ? String(active[0]._id) : '';
  });

  const activeVariants = Array.isArray(product?.variants)
    ? product.variants.filter(v => v && v.isActive !== false)
    : [];

  const selectedVariant = (() => {
    if (!selectedVariantId) return null;
    return activeVariants.find(v => String(v._id) === String(selectedVariantId)) || null;
  })();

  const unitPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
  const unitMrp = selectedVariant ? Number(selectedVariant.mrp) : Number(product.mrp);
  const discountPercentage = (unitMrp > unitPrice)
    ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100)
    : 0;

  const availableStock = (() => {
    if (selectedVariant && selectedVariant.stock !== null && selectedVariant.stock !== undefined) {
      return Number(selectedVariant.stock);
    }
    return Number(product.stock);
  })();
  const tamilNameMap = {
    'carrot': 'கேரட்',
    'tomato': 'தக்காளி',
    'onion': 'வெங்காயம்',
    'potato': 'உருளைக்கிழங்கு',
    'milk': 'பால்',
    'egg': 'முட்டை',
    'eggs': 'முட்டைகள்',
    'sugar': 'சர்க்கரை',
    'rice': 'அரிசி',
    'banana': 'வாழைப்பழம்',
    'apple': 'ஆப்பிள்',
    'orange': 'ஆரஞ்சு',
    'grapes': 'திராட்சை',
    'cabbage': 'முட்டைக்கோசு',
    'cauliflower': 'பூக்கோசு',
    'beetroot': 'பீட்ரூட்',
    'beans': 'பேரிக்காய்',
    'brinjal': 'கத்தரிக்காய்',
    'ladyfinger': 'வெண்டைக்காய்',
    'okra': 'வெண்டைக்காய்'
  };
  const baseName = String(product?.name || '').trim().toLowerCase();
  const displayName = (lang === 'ta')
    ? (product?.nameTa?.trim() || tamilNameMap[baseName] || product.name)
    : product.name;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      alert('Please login to add to cart');
      return;
    }

    setIsAdding(true);
    try {
      const qtyToSend = parseInt(quantity) || 1;
      const result = await addToCart(product._id, qtyToSend, selectedVariant ? selectedVariantId : null);
      if (result.success) {
        // Show success message briefly but STAY on the page
        setTimeout(() => {
          setIsAdding(false);
          setQuantity('1'); // Reset quantity after success
        }, 1500);
      } else {
        alert('Failed to add item to cart');
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add item to cart';
      alert(`Add to cart failed: ${errorMessage}`);
      setIsAdding(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!isAdmin) {
      alert('Only administrators can delete products');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await api.delete(`/api/products/${product._id}`);

      if (response.data.success) {
        alert('Product deleted successfully');
        if (onDelete) {
          onDelete(product._id);
        }
        // Refresh the page to update the product list
        window.location.reload();
      } else {
        alert(`Failed to delete product: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete product';
      alert(`Delete failed: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasSecondaryImage = product.images && product.images.length > 0;

  return (
    <div className={`product-card ${hasSecondaryImage ? 'has-hover-image' : ''}`}>
      {discountPercentage > 0 && (
        <div className="discount-badge">{discountPercentage}% OFF</div>
      )}

      {isAdmin && (
        <button
          className="delete-product-btn"
          onClick={handleDeleteProduct}
          disabled={isDeleting}
          title="Delete Product"
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      )}

      <div className="product-image-container">
        <div className="product-image">
          {product.image ? (
            <>
              <img
                src={sanitizeImageUrl(product.image)}
                alt={product.name}
                className="primary-img"
                onError={(e) => handleImageError(e)}
              />
              {product.images && product.images.length > 0 && (
                <img
                  src={sanitizeImageUrl(product.images[0] || product.image)}
                  alt={`${product.name} alternate`}
                  className="secondary-img"
                  onError={(e) => (e.target.style.display = 'none')}
                />
              )}
            </>
          ) : (
            <div className="placeholder-image">
              <span className="placeholder-icon">📦</span>
            </div>
          )}

          {availableStock === 0 && (
            <div className="out-of-stock-overlay">
              <span>Out of Stock</span>
            </div>
          )}


        </div>
      </div>

      <div className="product-info">
        <h3 className="product-name" style={{ textTransform: 'capitalize' }}>{displayName}</h3>
        <p className="product-description" style={{ textTransform: 'capitalize' }}>{displayName}</p>

        <div className="product-details">
          <span className="product-category">{product.category}</span>
          <span className="product-unit">per {product.unit}</span>
        </div>

        {activeVariants.length > 0 && (
          <select
            className="variant-select"
            value={selectedVariantId}
            onChange={(e) => {
              setSelectedVariantId(e.target.value);
              setQuantity('1');
            }}
          >
            {activeVariants.map((v) => (
              <option key={String(v._id)} value={String(v._id)}>
                {v.label}
              </option>
            ))}
          </select>
        )}

        <div className="product-price">
          <div className="price-box">
            <span className="price">₹{unitPrice}</span>
            {discountPercentage > 0 && <span className="mrp-strikethrough">₹{unitMrp}</span>}
          </div>
          {availableStock > 0 && (
            <span className="stock-info">{availableStock} available</span>
          )}
        </div>

        <div className="product-actions">
          {availableStock > 0 ? (
            <>
              <div className="quantity-selector">
                <button
                  onClick={() => setQuantity(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                  className="quantity-btn"
                >
                  -
                </button>
                <input
                  type="number"
                  className="quantity-input"
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') setQuantity('');
                    else {
                      const parsed = parseInt(val);
                      if (!isNaN(parsed)) setQuantity(String(Math.min(availableStock, Math.max(1, parsed))));
                    }
                  }}
                  onBlur={() => { if (quantity === '' || parseInt(quantity) < 1) setQuantity('1'); }}
                />
                <button
                  onClick={() => setQuantity(prev => String(Math.min(availableStock, (parseInt(prev) || 0) + 1)))}
                  className="quantity-btn"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isAdding}
                className="add-to-cart-btn"
              >
                {isAdding ? 'Adding...' : 'Add to Cart'}
              </button>
            </>
          ) : (
            <button className="add-to-cart-btn" disabled>Out of Stock</button>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProductCard;
