import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useI18n } from '../contexts/I18nContext';
import VoiceSearch from './VoiceSearch';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { getCartItemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, lang, setLang } = useI18n();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const cartItemCount = getCartItemCount();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          {t('brand.name', 'Nellai Rehoboth Department Store')}
        </Link>

        <div className="navbar-search">
          <VoiceSearch />
        </div>

        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
            {t('nav.home', 'Home')}
          </Link>
          <Link to="/products" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
            {t('nav.products', 'Products')}
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/cart" className="navbar-link cart-link" onClick={() => setIsMenuOpen(false)}>
                {t('nav.cart', 'Cart')}
                {cartItemCount > 0 && (
                  <span className="cart-badge">{cartItemCount}</span>
                )}
              </Link>
              <Link to="/orders" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
                {t('nav.orders', 'Orders')}
              </Link>
              {isAdmin && (
                <Link to="/admin" className="navbar-link admin-link" onClick={() => setIsMenuOpen(false)}>
                  {t('nav.admin', 'Admin')}
                </Link>
              )}
              <div className="navbar-user">
                <img
                  src={user?.avatar || '/male-avatar.svg'}
                  alt={user?.name || 'User avatar'}
                  className="user-avatar"
                  onError={(e) => {
                    // Fallback robustly to bundled male avatar
                    if (e.currentTarget.src.endsWith('/male-avatar.svg')) return;
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/male-avatar.svg';
                  }}
                />
                <span className="user-name">{user?.name}</span>
                <button onClick={handleLogout} className="logout-btn">
                  {t('nav.logout', 'Logout')}
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="navbar-link login-btn" onClick={() => setIsMenuOpen(false)}>
              {t('nav.login', 'Login')}
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            aria-label={t('nav.language', 'Language')}
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="navbar-link"
            style={{ padding: '6px 8px', border: '1px solid #eee', borderRadius: 6 }}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
          </select>
          <button
            className="navbar-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
