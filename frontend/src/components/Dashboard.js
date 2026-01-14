import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CreateClub from './CreateClub';
import ClubList from './ClubList';
import StylizedText from './StylizedText';
import EditProfile from './EditProfile';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [allClubs, setAllClubs] = useState([]); // Store all clubs from API
  const [badges, setBadges] = useState({ gold: 0, silver: 0, bronze: 0 });
  const [searchQuery, setSearchQuery] = useState('');
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
        setAllClubs(response.data);
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

  // Filter clubs: by default show only user's clubs (created or joined)
  const userClubs = allClubs.filter(club => club.is_member || club.is_creator);
  
  // Search results: clubs that user can join (not a member and not creator)
  const searchResults = searchQuery.trim() 
    ? allClubs.filter(club => 
        !club.is_member && 
        !club.is_creator &&
        (club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (club.location && club.location.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    : [];

  // Display clubs: user's clubs by default, or search results when searching
  const displayClubs = searchQuery.trim() ? searchResults : userClubs;

  return (
    <div className="dashboard-container">
      {/* RunSquad Header with Blue Icon - Top of Page */}
      <header className="runsquad-top-header">
        <div className="runsquad-header-content">
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
        <button 
          onClick={handleLogout} 
          className="logout-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </header>

      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h2>Your Running Clubs</h2>
          <p>Manage your teams and track activities</p>
        </div>
      </div>

      {/* Name and Buttons Section */}
      <header className="dashboard-header">
        <div className="header-bottom">
          <div className="user-info">
            <span 
              className="user-name clickable-name" 
              onClick={() => setShowEditProfile(true)}
              title="Click to edit profile"
            >
              {user?.name || 'User'}
            </span>
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
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-actions">
          <button onClick={() => setShowCreateClub(true)} className="primary-button">
            Create Club
          </button>
          {/* Bulk Import Users button hidden */}
          {/* <button onClick={() => navigate('/bulk-import')} className="secondary-button">
            Bulk Import Users
          </button> */}
        </div>

        {/* Search Section */}
        <div className="club-search-section">
          <div className="search-container">
            <div className="search-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            <input
              type="text"
              className="club-search-input"
              placeholder="Search for clubs to join..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-search-button"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <div className="search-results-header">
              <p className="search-results-count">
                {searchResults.length} {searchResults.length === 1 ? 'club found' : 'clubs found'}
              </p>
            </div>
          )}
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

        {showEditProfile && user && (
          <EditProfile
            user={user}
            onClose={() => setShowEditProfile(false)}
            onSuccess={(updatedUser) => {
              setUser(updatedUser);
              setShowEditProfile(false);
            }}
            onLogout={handleLogout}
          />
        )}

        <ClubList clubs={displayClubs} onJoin={fetchClubs} searchMode={!!searchQuery.trim()} />
      </main>
    </div>
  );
}

export default Dashboard;
