import axios from 'axios';

// Ensure API_URL always ends with /api
let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
  // If it doesn't end with /api, add it
  API_URL = API_URL.endsWith('/') ? API_URL + 'api' : API_URL + '/api';
}

// Log API URL for debugging (remove in production if needed)
console.log('API Base URL:', API_URL);
console.log('REACT_APP_API_URL env var:', process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (but not for auth endpoints)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // Don't add token to auth endpoints (login/register)
  const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
  if (token && !isAuthEndpoint) {
    // Clean the token (remove any whitespace)
    const cleanToken = token.trim();
    config.headers.Authorization = `Bearer ${cleanToken}`;
    console.log('Adding token to request:', cleanToken.substring(0, 20) + '...');
  } else if (!token && !isAuthEndpoint) {
    console.warn('No token available for protected endpoint:', config.url);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token is invalid, clear it (but not for login/register errors)
    if (error.response?.status === 401 || error.response?.status === 422) {
      const path = window.location.pathname;
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      
      // Only redirect if it's not an auth endpoint and we're not already on login/register
      if (!isAuthEndpoint && path !== '/login' && path !== '/register') {
        console.log('Token invalid, clearing and redirecting...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Don't redirect here, let the ProtectedRoute handle it
      }
    }
    return Promise.reject(error);
  }
);

export default api;
