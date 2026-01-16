import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    if (!isHomePage) return null;

    return (
        <footer className="site-footer">
            <div className="container footer-content">
                {/* 1. Left Section: Links */}
                <div className="footer-section left-links">
                    <ul className="footer-menu">
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                        <li><Link to="/shipping">Shipping Policy</Link></li>
                        <li><Link to="/refund">Refund Policy</Link></li>
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                        <li><Link to="/delivery">Delivery Info</Link></li>
                        <li><Link to="/terms">Terms and Conditions</Link></li>
                    </ul>
                </div>

                {/* 2. Center Section: Brand & Social */}
                <div className="footer-section center-brand">
                    <div className="footer-logo">
                        <span className="brand-icon">🥬</span>
                        <span className="brand-name">NRDS</span>
                    </div>
                    <p className="brand-description">
                        We're Nellai Rehoboth Department Store, an innovative team of food engineers. Our unique model minimizes fresh food handling by up to 85%, sourcing locally and dispatching within hours through cold chain logistics in eco-friendly containers.
                    </p>
                    <p className="copyright-text">© {new Date().getFullYear()} Nellai Rehoboth Department Store</p>
                </div>

                {/* 3. Right Section: Newsletter & Payments */}
                <div className="footer-section right-newsletter">
                    <h3 className="newsletter-title">Get Latest News</h3>
                    <p className="newsletter-desc">
                        Sign up to get 10% off your first order and stay up to date on the latest product releases, special offers and news.
                    </p>
                    <div className="newsletter-input-group">
                        <input type="email" placeholder="Your Email" className="newsletter-input" />
                        <button className="newsletter-btn">Subscribe</button>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
