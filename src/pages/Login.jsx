import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import './Login.css';
import { useI18n } from '../contexts/I18nContext';

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }

    // Check for OAuth errors in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'google_oauth_not_configured') {
      setError(t('auth.oauth_not_configured', 'Google OAuth is not fully configured. Please use email/password login.'));
    } else if (errorParam) {
      setError(t('auth.auth_failed', 'Authentication failed. Please try again.'));
    }
  }, [isAuthenticated, navigate, t]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', formData);

      if (response.data.success) {
        await login(response.data.token, response.data.user);
        navigate('/');
      } else {
        setError(response.data.message || t('auth.login.failed', 'Login failed'));
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || t('auth.login.try_again', 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    const baseUrl = process.env.REACT_APP_API_URL || 'https://nrds-backend.onrender.com';
    window.location.href = `${baseUrl}/api/auth/google`;
  };

  // Demo login buttons and handlers removed per request

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>{t('auth.login.title', 'Welcome Back!')}</h1>
            <p>{t('auth.login.subtitle', 'Sign in to your account')}</p>
          </div>

          <div className="login-content">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
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
                  placeholder={t('auth.password_ph', 'Enter your password')}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="signin-btn"
              >
                {loading ? t('auth.login.signing_in', 'Signing In...') : t('auth.login.sign_in', 'Sign In')}
              </button>
            </form>

            <button
              onClick={handleGoogleLogin}
              className="google-login-btn"
              disabled={loading}
            >
              <img src="/google-icon.svg" alt="Google" className="google-icon" />
              {t('auth.continue_google', 'Continue with Google')}
            </button>

            {/* Demo login UI removed */}

            <div className="signup-link">
              <p>
                {t('auth.login.no_account', "Don't have an account?")}
                <Link to="/signup"> {t('auth.signup.here', 'Sign up here')}</Link>
              </p>
            </div>
          </div>

          <div className="login-footer">
            <p>
              {t('auth.terms_login', 'By signing in, you agree to our Terms of Service and Privacy Policy.')}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
