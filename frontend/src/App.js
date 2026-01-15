import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ClubDetail from './components/ClubDetail';
import BulkImportUsers from './components/BulkImportUsers';
import './App.css';

// Protected Route Component with better localStorage handling
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication with retry logic for mobile browsers
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const authenticated = token !== null && 
                             token !== undefined && 
                             token !== '' && 
                             token.trim() !== '';
        setIsAuthenticated(authenticated);
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setIsChecking(false);
      }
    };

    // Check immediately
    checkAuth();
    
    // Also check after a small delay to handle race conditions (especially on mobile)
    const timeoutId = setTimeout(checkAuth, 200);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Show loading state while checking (prevents flash of login page)
  if (isChecking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club/:id"
            element={
              <ProtectedRoute>
                <ClubDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bulk-import"
            element={
              <ProtectedRoute>
                <BulkImportUsers />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
