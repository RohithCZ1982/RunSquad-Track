import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CreateClub from './CreateClub';
import ClubList from './ClubList';
import StylizedText from './StylizedText';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [badges, setBadges] = useState({ gold: 0, silver: 0, bronze: 0 });
  const navigate = useNavigate();

  const fetchClubs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token available for clubs fetch');
        navigate('/login', { replace: true });
        return;
      }
      
      console.log('Fetching clubs...');
      const response = await api.get('/clubs');
      console.log('Clubs response:', response);
      console.log('Clubs data:', response?.data);
      
      if (response && response.data) {
        console.log(`Setting ${response.data.length} clubs`);
        setClubs(response.data);
      } else {
        console.warn('No clubs data in response');
      }
    } catch (err) {
      console.error('Error fetching clubs:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      // If token is invalid, redirect to login
      if (err.response?.status === 401 || err.response?.status === 422) {
        console.log('Token invalid, clearing and redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        // Network error - might be CORS or server down
        console.error('Network error - check if backend is running');
      }
    }
  }, [navigate]);

  const fetchBadges = useCallback(async () => {
    try {
      const response = await api.get('/users/badges');
      setBadges(response.data);
    } catch (err) {
      console.error('Error fetching badges:', err);
      // Don't show error to user, just set to 0
      setBadges({ gold: 0, silver: 0, bronze: 0 });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found in Dashboard, redirecting to login...');
      navigate('/login', { replace: true });
      return;
    }
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    fetchClubs();
    fetchBadges();
  }, [navigate, fetchClubs, fetchBadges]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h2>Your Running Clubs</h2>
          <p>Manage your teams and track activities</p>
        </div>
      </div>

      <header className="dashboard-header">
        <div className="header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg className="waveform-icon" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M 0 20 L 15 20 L 20 5 L 25 35 L 30 10 L 35 30 L 40 15 L 45 25 L 50 20 L 100 20" 
                stroke="#3b82f6" 
                strokeWidth="4" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <StylizedText text="RunSquad" size="small" variant="light-bg" />
          </div>
        </div>
        <div className="header-bottom">
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <div className="user-badges">
              {badges.gold > 0 && (
                <div className="badge-item gold">
                  <span className="badge-icon">🥇</span>
                  <span className="badge-count">{badges.gold}</span>
                </div>
              )}
              {badges.silver > 0 && (
                <div className="badge-item silver">
                  <span className="badge-icon">🥈</span>
                  <span className="badge-count">{badges.silver}</span>
                </div>
              )}
              {badges.bronze > 0 && (
                <div className="badge-item bronze">
                  <span className="badge-icon">🥉</span>
                  <span className="badge-count">{badges.bronze}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => navigate('/progress')} className="header-button">My Progress</button>
          <button onClick={handleLogout} className="header-button">Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-actions">
          <button onClick={() => setShowCreateClub(true)} className="primary-button">
            Create Club
          </button>
          <button onClick={() => navigate('/bulk-import')} className="secondary-button">
            Bulk Import Users
          </button>
        </div>

        {showCreateClub && (
          <CreateClub
            onClose={() => setShowCreateClub(false)}
            onSuccess={() => {
              setShowCreateClub(false);
              fetchClubs();
            }}
          />
        )}

        <ClubList clubs={clubs} onJoin={fetchClubs} />
      </main>
    </div>
  );
}

export default Dashboard;
