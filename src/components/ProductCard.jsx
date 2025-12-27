import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import api from '../api/axios';
import './ProductCard.css';

const ProductCard = ({ product, onDelete }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, isAdmin } = useAuth();
  const { lang } = useI18n();
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
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
      alert('Please login to add items to cart');
      return;
    }

    setIsAdding(true);
    try {
      const result = await addToCart(product._id, quantity, selectedVariant ? selectedVariantId : null);
      if (result.success) {
        // Show success message and redirect to orders page
        console.log('Added to cart successfully');
        // Small delay to show the success state before redirecting
        setTimeout(() => {
          navigate('/cart');
        }, 500);
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

  return (
    <div className="product-card">
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
      <div className="product-image">
        {!imageError && product.image ? (
          <img
            src={product.image}
            alt={displayName}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="placeholder-image">
            <div className="placeholder-icon">
              {product.category === 'fruits' && '🍎'}
              {product.category === 'vegetables' && '🥕'}
              {product.category === 'dairy' && '🥛'}
              {product.category === 'meat' && '🥩'}
              {product.category === 'bakery' && '🍞'}
              {product.category === 'beverages' && '🧃'}
              {product.category === 'snacks' && '🍿'}
              {product.category === 'frozen' && '🧊'}
              {!['fruits', 'vegetables', 'dairy', 'meat', 'bakery', 'beverages', 'snacks', 'frozen'].includes(product.category) && '📦'}
            </div>
            <span className="placeholder-text">{displayName}</span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="out-of-stock-overlay">
            <span>Out of Stock</span>
          </div>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">{displayName}</h3>
        <p className="product-description">{product.description}</p>

        <div className="product-details">
          <span className="product-category">{product.category}</span>
          <span className="product-unit">per {product.unit}</span>
        </div>

        {activeVariants.length > 0 && (
          <div className="product-details">
            <select
              value={selectedVariantId}
              onChange={(e) => {
                setSelectedVariantId(e.target.value);
                setQuantity(1);
              }}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #e0e0e0' }}
            >
              {activeVariants.map((v) => (
                <option key={String(v._id)} value={String(v._id)}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="product-price">
          <span className="price">₹{unitPrice}</span>
          {availableStock > 0 && (
            <span className="stock-info">{availableStock} available</span>
          )}
        </div>

        {availableStock > 0 ? (
          <div className="product-actions">
            <div className="quantity-selector">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="quantity-btn"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={availableStock}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(availableStock, val)));
                }}
                className="quantity-input"
              />
              <button
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                className="quantity-btn"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isAdding || !isAuthenticated}
              className={`add-to-cart-btn ${isAdding ? 'adding' : ''}`}
            >
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        ) : (
          <button className="add-to-cart-btn disabled" disabled>
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
