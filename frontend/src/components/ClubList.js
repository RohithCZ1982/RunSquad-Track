import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './ClubList.css';

function ClubList({ clubs, onJoin }) {
  const navigate = useNavigate();

  const handleJoin = async (clubId) => {
    try {
      await api.post(`/clubs/${clubId}/join`);
      alert('Successfully joined club!');
      onJoin();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join club');
    }
  };

  return (
    <div className="club-list">
      <h2>Clubs</h2>
      {clubs.length === 0 ? (
        <p className="no-clubs">No clubs available. Create one to get started!</p>
      ) : (
        <div className="clubs-grid">
          {clubs.map((club) => (
            <div 
              key={club.id} 
              className="club-card"
              onClick={() => navigate(`/club/${club.id}`)}
            >
              <div className="club-card-content">
                <div className="club-icon-wrapper">
                  <div className="club-icon">👥</div>
                </div>
                <div className="club-info">
                  <h3>{club.name}</h3>
                  <p className="club-description">{club.description || 'No description'}</p>
                </div>
                <div className="club-meta">
                  {club.location && (
                    <p className="location">📍 {club.location}</p>
                  )}
                  <p className="member-count">👥 {club.member_count} members</p>
                </div>
              </div>
              {!club.is_member && (
                <button 
                  className="join-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoin(club.id);
                  }}
                >
                  Join Club
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClubList;
