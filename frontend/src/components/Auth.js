import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

function Auth() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  
  useEffect(() => {
    // Set active tab based on route
    if (location.pathname === '/register') {
      setActiveTab('signup');
    } else {
      setActiveTab('login');
    }
  }, [location.pathname]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Attempting login with:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response status:', response.status);
      console.log('Login response data:', response.data);
      
      if (response && response.data && response.data.access_token) {
        console.log('Login successful! Saving token...');
        
        const cleanToken = response.data.access_token.trim();
        localStorage.setItem('token', cleanToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        const savedToken = localStorage.getItem('token');
        console.log('Token saved:', savedToken ? 'Yes' : 'No');
        
        if (savedToken && savedToken === cleanToken) {
          console.log('Token verified successfully. Redirecting...');
          // Use React Router navigate instead of window.location for better reliability
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 50);
        } else {
          setError('Failed to save authentication token. Please try again.');
        }
      } else {
        setError('Login failed: No token received.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.msg || 
                       err.message || 
                       'Login failed. Please check your credentials.';
      setError(errorMsg);
      
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials or register a new account.');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/register', { name, email, password });
      if (response && response.data && response.data.access_token) {
        const cleanToken = response.data.access_token.trim();
        localStorage.setItem('token', cleanToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Use React Router navigate instead of window.location for better reliability
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 50);
      } else {
        setError('Registration failed: No token received.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container">
            <svg className="waveform-icon" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M 0 20 L 15 20 L 20 5 L 25 35 L 30 10 L 35 30 L 40 15 L 45 25 L 50 20 L 100 20" 
                stroke="#3b82f6" 
                strokeWidth="6" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <h1>RunSquad</h1>
          </div>
          <p className="tagline">Team management for running clubs</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
          >
            Login
          </button>
          <button
            className={`tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signup');
              setError('');
            }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'login' ? (
          <div className="auth-form-container">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Login to your account</p>
            </div>
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="submit-button">Login</button>
            </form>
          </div>
        ) : (
          <div className="auth-form-container">
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Sign up to get started</p>
            </div>
            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoCapitalize="words"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" className="submit-button">Sign Up</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;
