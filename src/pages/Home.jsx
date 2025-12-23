import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import api from '../api/axios';
import './Home.css';
import { useI18n } from '../contexts/I18nContext';

const Home = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const carouselImages = [
    'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzvZlsFbisDSev-EBQDhF9qkV8kJY3DLxyi3MvENJGfbg_qEH58_LjD-0ysAd4fMM4eaVYuweZaPwXFmj0-9crDBfKa0EipMG6F9bmgf_3_eBrBwyMbXG26RV4RDQ_suPU5rPtOgBfKA8s=s1360-w1360-h1020-rw',
    'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSwZ6szdRfdeO2EvksPKckPWq_urDpIPKAptlScmpSZYXffORdEVUJmucp5aXRir1BAOlAesI4mw5gAoGIbS-zUsZqCjb5Z7hh0bK4iT7RtyxGO05Gk6oL_l1vYr81YBe-3Wx1h2=s1360-w1360-h1020-rw',
    'https://tse4.mm.bing.net/th/id/OIP.RTVvaoBK2fkgBuxVfHIiIAHaDt?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3'
  ];
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    if (!carouselImages.length) return;
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(id);
  }, [carouselImages.length]);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await api.get('/api/products?limit=8&featured=true');
      setFeaturedProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle home page redirect (removed unused quick shop)

  const categories = [
    'fruits', 'vegetables', 'dairy', 'meat', 'bakery',
    'beverages', 'snacks', 'frozen', 'pantry', 'household'
  ];

  const handleShopNow = () => {
    if (selectedCategory) {
      navigate(`/products?category=${encodeURIComponent(selectedCategory)}`);
    } else {
      navigate('/products');
    }
  };

  // Removed unused handleGoToOrders

  return (
    <div className="home">
      {/* Hero Section (Modern) */}
      <section className="hero hero-modern">
        <div className="container hero-grid">
          <div className="hero-left">
            <div className="hero-badge">📍 {t('home.badge', 'Grocery Delivery Service')}</div>
            <h1 className="hero-title">
              {t('home.title_part1', 'Get')} <span className="accent">{t('home.title_accent', 'fresh Grocery')}</span><br />
              {t('home.title_part2', 'Enjoy healthy life.')}
            </h1>
            <p className="hero-subtitle">
              {t('home.subtitle', 'Your daily needs delivered fast. Discover fresh produce, essentials, and more.')}
            </p>
            <div className="hero-controls">
              <select
                className="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">{t('home.select_category', 'Select Category')}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary shop-now" onClick={handleShopNow}>{t('home.shop_now', 'Shop Now')}</button>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-carousel">
              <div className="carousel-inner">
                {carouselImages.map((src, idx) => (
                  <div key={idx} className={`carousel-slide ${slide === idx ? 'active' : ''}`}>
                    <img
                      className="carousel-img"
                      src={src}
                      alt={t('home.carousel_alt', 'store showcase')}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (e.currentTarget.src.endsWith('/grocery-hero.svg')) return;
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/grocery-hero.svg';
                      }}
                    />
                  </div>
                ))}
              </div>
              <button className="carousel-arrow left" aria-label={t('home.prev', 'Previous')} onClick={() => setSlide((slide - 1 + carouselImages.length) % carouselImages.length)}>
                ‹
              </button>
              <button className="carousel-arrow right" aria-label={t('home.next', 'Next')} onClick={() => setSlide((slide + 1) % carouselImages.length)}>
                ›
              </button>
              <div className="carousel-dots">
                {carouselImages.map((_, i) => (
                  <button
                    key={i}
                    className={`dot ${i === slide ? 'active' : ''}`}
                    aria-label={`${t('home.go_to_slide', 'Go to slide')} ${i + 1}`}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>{t('home.why_title', 'Why Choose Nellai Rehoboth Department Store?')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎤</div>
              <h3>{t('home.voice_title', 'Voice Ordering')}</h3>
              <p>{t('home.voice_desc', 'Simply speak to add items to your cart. No typing required!')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚚</div>
              <h3>{t('home.delivery_title', 'Fast Delivery')}</h3>
              <p>{t('home.delivery_desc', 'Get your groceries delivered fresh to your doorstep.')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>{t('home.payment_title', 'Multiple Payment Options')}</h3>
              <p>{t('home.payment_desc', 'Pay with card, digital wallets, or cash on delivery.')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>{t('home.secure_title', 'Secure & Safe')}</h3>
              <p>{t('home.secure_desc', 'Your data and payments are protected with top-level security.')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products">
        <div className="container">
          <h2>{t('home.featured_title', 'Featured Products')}</h2>
          {loading ? (
            <div className="loading-grid">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="product-skeleton"></div>
              ))}
            </div>
          ) : (
            <div className="products-grid">
              {featuredProducts.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
          <div className="text-center">
            <Link to="/products" className="btn btn-outline">
              {t('home.view_all', 'View All Products')}
            </Link>
          </div>
        </div>
      </section>


      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-col">
            <h4>{t('home.footer.about', 'About')}</h4>
            <ul className="footer-links">
              <li><Link to="/AboutUs">{t('home.footer.about_us', 'About Us')}</Link></li>
              <li><a href="/news">{t('home.footer.in_news', 'In News')}</a></li>
              <li><a href="/sustainability">{t('home.footer.sustainability', 'Sustainability')}</a></li>
              <li><a href="/privacy">{t('home.footer.privacy', 'Privacy Policy')}</a></li>
              <li><a href="/terms">{t('home.footer.terms', 'Terms & Conditions')}</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>{t('home.footer.help', 'Help')}</h4>
            <ul className="footer-links">
              <li><a href="/faqs">{t('home.footer.faqs', 'FAQs')}</a></li>
              <li><a href="/contact">{t('home.footer.contact', 'Contact Us')}</a></li>
              <li><a href="/payments">{t('home.footer.payments', 'Payments')}</a></li>
              <li><a href="/shipping">{t('home.footer.shipping', 'Shipping')}</a></li>
              <li><a href="/returns">{t('home.footer.returns', 'Returns')}</a></li>
            </ul>
          </div>
          <div className="footer-col footer-brand">
            <div className="brand-mark">{t('brand.name', 'Nellai Rehoboth Department Store')}</div>
            <div className="app-badges">
              <a href="https://play.google.com/" target="_blank" rel="noreferrer" className="badge">{t('home.footer.play', 'Get it on Google Play')}</a>
              <a href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer" className="badge">{t('home.footer.app_store', 'Download on the App Store')}</a>
            </div>
            <div className="contact-rows">
              <div className="footer-item"><span className="footer-label">{t('home.footer.phone', 'Phone:')}</span><a href="tel:+919942075849">+91 99420 75849</a></div>
              <div className="footer-item"><span className="footer-label">{t('home.footer.email', 'Email:')}</span><a href="mailto:nellairehoboth@gmail.com">nellairehoboth@gmail.com</a></div>
              <div className="footer-item location">
                <span className="footer-label">{t('home.footer.location', 'Location:')}</span>
                <div className="location-container">
                  <span>8H22+QJ9, Perundurai-Thudupathi-Thingalur Rd, SMB Nagar, Thuduppathi, Tamil Nadu 638057</span>
                  <a
                    href="https://www.google.com/maps?sca_esv=e53f428efd45d366&kgmid=/g/11cnb253y8&shndl=30&shem=damc,lcuae,ptotplc,uaasie,shrtsdl&kgs=40bbb6bc68e47db0&um=1&ie=UTF-8&fb=1&gl=in&sa=X&geocode=KQcDD3LXEqk7Ma1SP4WyH9Md&daddr=8H22%2BQJ9,+Perundurai-Thudupathi-Thingalur+Rd,+SMB+Nagar,+Thuduppathi,+Tamil+Nadu+638057"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link"
                    title={t('home.footer.view_map', 'View on Google Maps')}
                  >
                    <i className="map-icon">📍</i> {t('home.footer.view_on_map', 'View on Map')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
