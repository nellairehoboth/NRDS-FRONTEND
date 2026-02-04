import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

import VoiceSearch from './VoiceSearch';
import AnnouncementBar from './AnnouncementBar';
import logo from '../assets/logo.png';
import ProfileDropdown from './ProfileDropdown';
import api from '../api/axios';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { getCartItemCount } = useCart();
  const navRef = React.useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileImageError, setMobileImageError] = useState(false);
  const { pathname } = useLocation();
  const cartItemCount = getCartItemCount();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/products/categories');
        if (response.data.success && response.data.categories) {
          // User requested specific set: vegetable cofee chips choclate biscuit rice sugar tea
          const allCats = response.data.categories;
          const targetSet = ['vegetable', 'coffee', 'chips', 'chocolate', 'biscuit', 'rice', 'sugar', 'tea'];

          const filtered = targetSet.map(target => {
            return allCats.find(c => c.toLowerCase().includes(target));
          }).filter(Boolean);

          // Remove duplicates just in case
          const unique = [...new Set(filtered)];
          setCategories(unique);
        }
      } catch (error) {
        console.error('Failed to fetch categories', error);
        // Fallback to target set if backend is offline
        const targetSet = ['vegetable', 'coffee', 'chips', 'chocolate', 'biscuit', 'rice', 'sugar', 'tea'];
        setCategories(targetSet);
      }
    };
    fetchCategories();
  }, []);

  const [scrollDirection, setScrollDirection] = useState(1); // 1 for right, -1 for left

  useEffect(() => {
    let interval;
    if (!isHovered && navRef.current) {
      interval = setInterval(() => {
        if (navRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = navRef.current;

          // Check boundaries and reverse direction
          if (scrollDirection === 1 && scrollLeft + clientWidth >= scrollWidth - 1) {
            setScrollDirection(-1);
          } else if (scrollDirection === -1 && scrollLeft <= 0) {
            setScrollDirection(1);
          }

          // Move based on direction
          navRef.current.scrollLeft += scrollDirection;
        }
      }, 20); // 20ms delay as set by user
    }
    return () => clearInterval(interval);
  }, [isHovered, categories, scrollDirection]);

  const handleWheel = (e) => {
    if (navRef.current) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      navRef.current.scrollLeft += e.deltaY;
    }
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="site-header">
      {/* 0. Sliding Announcement Bar */}
      {!isAuthPage && <AnnouncementBar />}

      {/* 1. Top Bar (Dark Green - Refined Layout) */}
      {!isAuthPage && (
        <div className="top-header-dark">
          <div className="container top-header-grid">
            <div className="top-header-left">
              <div className="top-search-wrapper">
                <VoiceSearch />
              </div>
            </div>

            <div className="top-header-center">
              <span className="store-name-top">
                NELLAI REHOBOTH DEPARTMENT STORE
              </span>
            </div>

            <div className="top-header-right">
              <div className="top-header-contact">
                <a href="mailto:nellairehoboth@gmail.com" className="contact-item">
                  <span className="info-icon">📧</span> nellairehobothdepartmentstore@gmail.com
                </a>
                <span className="contact-item">
                  <span className="info-icon">📞</span> +91 99420 75849
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Header (Dark Green - Logo + Categories + Profile) */}
      <div className="main-header-dark">
        <div className="container main-header-flex">

          {/* Logo */}
          <Link to="/" className="brand-logo">
            <img src={logo} alt="NRDS Logo" className="brand-logo-img" />
            <span className="logo-text">NRDS</span>
          </Link>

          {/* Inline Categories (Center) */}
          <nav
            className="inline-categories"
            ref={navRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onWheel={handleWheel}
          >
            <Link to="/products" className="cat-item-link">
              <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/15547/15547234.gif" alt="" /></span> Products
            </Link>
            {/* Top Categories with specific icons */}
            {categories.find(c => c.toLowerCase().includes('vegetable')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('vegetable')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/15547/15547209.gif" alt="" /></span> Vegetables
              </Link>
            )}

            {categories.find(c => c.toLowerCase().includes('coffee')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('coffee')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/18499/18499084.gif" alt="" /></span> Coffee
              </Link>
            )}

            {categories.find(c => c.toLowerCase().includes('chips')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('chips')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/15240/15240128.gif" alt="" /></span> Chips
              </Link>
            )}

            {categories.find(c => c.toLowerCase().includes('chocolate')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('chocolate')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/15240/15240153.gif" alt="" /></span> Chocolate
              </Link>
            )}

            {categories.find(c => c.toLowerCase().includes('biscuit')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('biscuit')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/17507/17507052.gif" alt="" /></span> Biscuits
              </Link>
            )}

            {categories.find(c => c.toLowerCase().includes('rice')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('rice')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/12277/12277932.gif" alt="" /></span> Rice
              </Link>
            )}

            {categories.find(c => c.toLowerCase().includes('sugar')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('sugar')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/14324/14324605.gif" alt="" /></span> Sugar
              </Link>
            )}

            {categories.find(c => c.toLowerCase().includes('tea')) && (
              <Link to={`/products?category=${encodeURIComponent(categories.find(c => c.toLowerCase().includes('tea')))}`} className="cat-item-link">
                <span className="cat-icon-outline"><img src="https://cdn-icons-gif.flaticon.com/13373/13373331.gif" alt="" /></span> Tea
              </Link>
            )}
          </nav>

          {/* Utility / User Profile (Right) */}
          <div className="header-icons-right">
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : (
              <div className="auth-links">
                <Link to="/login" className="auth-link auth-login">Login</Link>
                <Link to="/signup" className="auth-link auth-signup">Signup</Link>
              </div>
            )}



            <Link to="/cart" className="icon-wrap cart-wrap">
              🛒
              <span className="cart-count">{cartItemCount}</span>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button className="mobile-toggle-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-menu" onClick={() => setIsMenuOpen(false)}>×</button>
            <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link to="/products" onClick={() => setIsMenuOpen(false)}>Products</Link>
            {isAuthenticated && (
              <>
                <Link to="/profile" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
                <Link to="/orders" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
              </>
            )}

            <hr className="mobile-menu-divider" />

            <div className="mobile-auth-section">
              {isAuthenticated ? (
                <div className="mobile-user-info">
                  <div className="mobile-user-header">
                    <div className="user-avatar-circle">
                      {user?.avatar && !mobileImageError ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="user-avatar-img"
                          onError={() => setMobileImageError(true)}
                        />
                      ) : (
                        getUserInitials(user?.name)
                      )}
                    </div>
                    <div className="mobile-user-details">
                      <span className="user-display-name">{user?.name}</span>
                      {isAdmin && <span className="admin-badge-mobile">Admin</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <Link to="/admin" className="mobile-admin-link" onClick={() => setIsMenuOpen(false)}>
                      🛡️ Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="mobile-logout-btn"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>Login</Link>
                  <Link to="/signup" onClick={() => setIsMenuOpen(false)}>Signup</Link>
                </>
              )}
            </div>

            <hr className="mobile-menu-divider" />

            {categories.map((cat) => (
              <Link key={cat} to={`/products?category=${encodeURIComponent(cat)}`} onClick={() => setIsMenuOpen(false)}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
