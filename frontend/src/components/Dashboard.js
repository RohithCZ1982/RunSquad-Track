import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CreateClub from './CreateClub';
import ClubList from './ClubList';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [clubs, setClubs] = useState([]);
  const navigate = useNavigate();

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
  }, [navigate]);

  const fetchClubs = async () => {
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
  };

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
        <h1>RunSquad</h1>
        <div className="header-actions">
          <span>Welcome, {user?.name}</span>
          <button onClick={() => navigate('/progress')}>My Progress</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-actions">
          <button onClick={() => setShowCreateClub(true)} className="primary-button">
            Create Club
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
