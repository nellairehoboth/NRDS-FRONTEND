import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import './Signup.css';
import { useI18n } from '../contexts/I18nContext';

const Signup = () => {
  const { isAuthenticated, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // Multi-step form

  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError(t('auth.signup.name_required', 'Name is required'));
      return false;
    }
    if (!formData.email.trim()) {
      setError(t('auth.signup.email_required', 'Email is required'));
      return false;
    }
    if (!formData.password) {
      setError(t('auth.signup.password_required', 'Password is required'));
      return false;
    }
    if (formData.password.length < 6) {
      setError(t('auth.signup.password_min', 'Password must be at least 6 characters'));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.signup.password_mismatch', 'Passwords do not match'));
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/signup', formData);

      if (response.data.success) {
        await login(response.data.token, response.data.user, rememberMe);
        navigate('/');
      } else {
        setError(response.data.message || t('auth.signup.failed', 'Signup failed'));
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.response?.data?.message || t('auth.signup.try_again', 'Signup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Save rememberMe preference before redirecting
    localStorage.setItem('temp_remember_me', rememberMe);
    // Redirect to backend Google OAuth endpoint
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    window.location.href = `${baseUrl}/api/auth/google`;
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <h1>{t('auth.signup.title', 'Join With NRDS !')}</h1>
            <p>{t('auth.signup.subtitle', 'Create your account to start shopping with voice commands')}</p>
          </div>

          <div className="signup-content">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="step-content">
                <h3>{t('auth.signup.account_info', 'Account Information')}</h3>
                <form className="signup-form">
                  <div className="form-group">
                    <label htmlFor="name">{t('auth.full_name', 'Full Name')}</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder={t('auth.full_name_ph', 'Enter your full name')}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">{t('auth.email', 'Email Address')}</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder={t('auth.email_ph', 'Enter your email')}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">{t('auth.password', 'Password')}</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      placeholder={t('auth.password_create_ph', 'Create a password (min 6 characters)')}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">{t('auth.confirm_password', 'Confirm Password')}</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder={t('auth.confirm_password_ph', 'Confirm your password')}
                      className="form-input"
                    />
                  </div>

                  <div className="form-options">
                    <label className="remember-me">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>{t('auth.remember_me', 'Remember Me')}</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="next-btn"
                  >
                    {t('auth.signup.next_step', 'Next Step →')}
                  </button>
                </form>
              </div>
            )}

            {step === 2 && (
              <div className="step-content">
                <h3>{t('auth.signup.contact_addr', 'Contact & Address (Optional)')}</h3>
                <form onSubmit={handleSubmit} className="signup-form">
                  <div className="form-group">
                    <label htmlFor="phone">{t('auth.phone', 'Phone Number')}</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('auth.phone_ph', 'Enter your phone number')}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address.street">{t('auth.address.street', 'Street Address')}</label>
                    <input
                      type="text"
                      id="address.street"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleInputChange}
                      placeholder={t('auth.address.street_ph', 'Enter your street address')}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="address.city">{t('auth.address.city', 'City')}</label>
                      <input
                        type="text"
                        id="address.city"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleInputChange}
                        placeholder={t('auth.address.city_ph', 'City')}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="address.state">{t('auth.address.state', 'State')}</label>
                      <input
                        type="text"
                        id="address.state"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleInputChange}
                        placeholder={t('auth.address.state_ph', 'State')}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="address.zipCode">{t('auth.address.zip', 'ZIP Code')}</label>
                      <input
                        type="text"
                        id="address.zipCode"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleInputChange}
                        placeholder={t('auth.address.zip_ph', 'ZIP Code')}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="address.country">{t('auth.address.country', 'Country')}</label>
                      <select
                        id="address.country"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleInputChange}
                        className="form-input"
                      >
                        <option value="India">India</option>
                        <option value="USA">USA</option>
                        <option value="UK">UK</option>
                        <option value="Canada">Canada</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="back-btn"
                    >
                      {t('auth.signup.back', '← Back')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="signup-btn"
                    >
                      {loading ? t('auth.signup.creating', 'Creating Account...') : t('auth.signup.create', 'Create Account')}
                    </button>
                  </div>
                </form>
              </div>
            )}


            <button
              onClick={handleGoogleSignup}
              className="google-signup-btn"
              disabled={loading}
            >
              <img src="https://img.icons8.com/?size=96&id=17949&format=png" alt="Google" className="google-icon" />
              {t('auth.signup_with_google', 'Sign up with Google')}
            </button>

            <div className="login-link">
              <p>
                {t('auth.signup.has_account', 'Already have an account?')}
                <Link to="/login"> {t('auth.login.here', 'Login here')}</Link>
              </p>
            </div>
          </div>

          <div className="signup-footer">
            <p>
              {t('auth.terms_signup', 'By creating an account, you agree to our Terms of Service and Privacy Policy.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
