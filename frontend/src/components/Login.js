import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import StylizedText from './StylizedText';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Attempting login with:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response status:', response.status);
      console.log('Login response data:', response.data);
      
      if (response && response.data && response.data.access_token) {
        console.log('Login successful! Saving token...');
        
        // Clean and save token (remove any whitespace)
        const cleanToken = response.data.access_token.trim();
        localStorage.setItem('token', cleanToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Verify token was saved correctly
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        console.log('Token saved:', savedToken ? 'Yes' : 'No');
        console.log('Token length:', savedToken?.length);
        console.log('Token preview:', savedToken?.substring(0, 30) + '...');
        console.log('User saved:', savedUser ? 'Yes' : 'No');
        
        if (savedToken && savedToken === cleanToken) {
          console.log('Token verified successfully. Redirecting...');
          // Small delay to ensure localStorage is written
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 100);
        } else {
          console.error('Token verification failed!');
          console.error('Expected:', cleanToken.substring(0, 30));
          console.error('Got:', savedToken?.substring(0, 30));
          setError('Failed to save authentication token. Please try again.');
        }
      } else {
        console.error('No access_token in response:', response?.data);
        setError('Login failed: No token received. Response: ' + JSON.stringify(response?.data));
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error status:', err.response?.status);
      console.error('Error response:', err.response?.data);
      console.error('Error message:', err.message);
      
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.msg || 
                       err.message || 
                       'Login failed. Please check your credentials.';
      setError(errorMsg);
      
      // If user doesn't exist, suggest registration
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials or register a new account.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <StylizedText text="RunSquad" size="large" variant="dark-bg" />
        </div>
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
