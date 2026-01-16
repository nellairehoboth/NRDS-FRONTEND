import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Home.css';
import { useI18n } from '../contexts/I18nContext';

const Home = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const scrollRef = React.useRef(null);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/products/categories');
        if (response.data.success && response.data.categories) {
          const allCats = response.data.categories;

          // Target categories with their specific images
          const targets = [
            { key: 'vegetable', img: 'https://cdn-icons-gif.flaticon.com/15547/15547209.gif' },
            { key: 'coffee', img: 'https://cdn-icons-gif.flaticon.com/18499/18499084.gif' },
            { key: 'chips', img: 'https://cdn-icons-gif.flaticon.com/15240/15240128.gif' },
            { key: 'chocolate', img: 'https://cdn-icons-gif.flaticon.com/15240/15240153.gif' },
            { key: 'cake', img: 'https://cdn-icons-gif.flaticon.com/18545/18545045.gif' },
            { key: 'oil', img: 'https://cdn-icons-gif.flaticon.com/15547/15547184.gif' },
            { key: 'biscuits', img: 'https://cdn-icons-gif.flaticon.com/17507/17507052.gif' },
            { key: 'shampoo', img: 'https://cdn-icons-gif.flaticon.com/17695/17695858.gif' },
            { key: 'tea', img: 'https://cdn-icons-gif.flaticon.com/13373/13373331.gif' },
            { key: 'rice', img: 'https://cdn-icons-gif.flaticon.com/12277/12277932.gif' }
          ];

          const mappedCategories = targets.map(t => {
            const match = allCats.find(c => c.toLowerCase().includes(t.key));
            if (match) {
              return {
                id: match, // The actual category name from DB
                name: match.charAt(0).toUpperCase() + match.slice(1),
                img: t.img
              };
            }
            return null;
          }).filter(Boolean);

          setCategories(mappedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);


  const handleWheel = (e) => {
    if (scrollRef.current) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // Allow natural horizontal scroll
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };




  return (
    <div className="home">
      {/* Hero Section (2-Column Banners) */}
      <section className="hero-dual-banner">
        <div className="container-wide hero-grid-2">

          {/* Left Banner: Vegetables (Teal) */}
          <div className="hero-banner bg-teal-light">
            <div className="hero-text">
              <h2>Tasty Vegetables<br />from Farm Vendors</h2>
              <p className="hero-sub">Every Fridays Check<br />Best Market Deals!</p>
              <button className="btn-hero-orange" onClick={() => navigate('/products?category=vegetables')}>Shop Now</button>
            </div>
            <img
              src="https://images.unsplash.com/photo-1590779033100-9f60a05a013d?q=80&w=600&auto=format&fit=crop"
              alt="Vegetables in Crate"
              className="hero-img-crate"
            />
          </div>

          {/* Right Banner: Fruits (Orange) */}
          <div className="hero-banner bg-orange-pastel">
            <div className="hero-text">
              <h2>Delicious Fruits<br />from Farm Vendors</h2>
              <p className="hero-sub">Fresh & Non GMO<br />Sweet Fruits</p>
              <button className="btn-hero-orange" onClick={() => navigate('/products?category=fruits')}>Shop Now</button>
            </div>
            <img
              src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=600&auto=format&fit=crop"
              alt="Fruits in Crate"
              className="hero-img-crate"
            />
          </div>

        </div>
      </section>

      <section className="category-section">
        <div className="container">
          <div className="section-header-center">
            <h2>{t('home.browse_category', 'Categories')}</h2>
          </div>

          <div
            className="category-train-container"
            ref={scrollRef}
            onWheel={handleWheel}
          >
            <div className="category-grid-featured">
              {categories.map((cat, index) => (
                <div
                  key={index}
                  className="category-item"
                  onClick={() => navigate(`/products?category=${cat.id}`)}
                >
                  <div className="cat-image-wrapper">
                    <img src={cat.img} alt={cat.name} className="cat-img-3d" />
                  </div>
                  <h3 className="cat-label">{cat.name}</h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Banners Section (3-Column Layout) */}
      <section className="promo-banners">
        <div className="container promo-grid-3">
          {/* Banner 1: Seafood (Green Theme) */}
          {/* Banner 1: Bakery (Green Theme) */}
          <div className="promo-card-modern bg-green-soft">
            <div className="promo-text-modern">
              <h3>Bakery Freshness<br />Everyday!</h3>
              <button
                className="btn-shop-modern"
                onClick={() => navigate('/products?category=Cake')}
              >
                Shop Now
              </button>
            </div>
            <img
              src="https://cakewhiz.com/wp-content/uploads/2020/02/Kids-Chocolate-Birthday-Cake-Recipe.jpg"
              alt="Fresh Bakery"
              className="promo-img-modern"
            />
          </div>

          {/* Banner 2: Chocolate (Orange Theme) */}
          <div className="promo-card-modern bg-orange-soft">
            <div className="promo-text-modern">
              <h3>Rich<br />Chocolates</h3>
              <button
                className="btn-shop-modern"
                onClick={() => navigate('/products?category=Chocolate')}
              >
                Shop Now
              </button>
            </div>
            <img
              src="https://royceindia.com/cdn/shop/files/ChocolateBarBlack_1.webp?v=1705398052&width=900"
              alt="Rich Chocolates"
              className="promo-img-modern"
            />
          </div>

          {/* Banner 3: Coffee (Blue Theme) */}
          <div className="promo-card-modern bg-blue-soft">
            <div className="promo-text-modern">
              <h3>Aromatic<br />Coffee</h3>
              <button
                className="btn-shop-modern"
                onClick={() => navigate('/products?category=Instant Coffee')}
              >
                Shop Now
              </button>
            </div>
            <img
              src="https://media-cldnry.s-nbcnews.com/image/upload/newscms/2019_33/2203981/171026-better-coffee-boost-se-329p.jpg"
              alt="Aromatic Coffee"
              className="promo-img-modern"
            />
          </div>
        </div>
      </section>



    </div>
  );
};

export default Home;
