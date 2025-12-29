import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const processed = React.useRef(false);

  useEffect(() => {
    if (processed.current) return;

    const handleAuthSuccess = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error || !token) {
        processed.current = true;
        navigate('/login?error=' + (error || 'no_token'));
        return;
      }

      processed.current = true;
      try {
        // Decode token to get user info (basic decode, not verification)
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Create user object from token payload
        const user = {
          _id: payload.userId,
          email: payload.email,
          role: payload.role,
          credits: payload.credits
        };

        // Login with the token and user data
        await login(token, user);

        // Redirect to home page
        navigate('/');
      } catch (error) {
        console.error('Token processing error:', error);
        navigate('/login?error=invalid_token');
      }
    };

    handleAuthSuccess();
  }, [searchParams, login, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Processing Google Login...</h2>
        <p>Please wait while we complete your authentication.</p>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2c5530',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 2s linear infinite',
          margin: '20px auto'
        }}></div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthSuccess;
