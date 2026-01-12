import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ScheduleRun from './ScheduleRun';
import ActivityFeed from './ActivityFeed';
import './ClubDetail.css';

function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [scheduledRuns, setScheduledRuns] = useState([]);
  const [showScheduleRun, setShowScheduleRun] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteRunConfirm, setDeleteRunConfirm] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    fetchClub();
    fetchScheduledRuns();
  }, [id]);

  const fetchClub = async () => {
    try {
      const response = await api.get(`/clubs/${id}`);
      setClub(response.data);
    } catch (err) {
      console.error('Error fetching club:', err);
    }
  };

  const fetchScheduledRuns = async () => {
    try {
      const response = await api.get(`/runs/schedule/${id}`);
      setScheduledRuns(response.data);
    } catch (err) {
      console.error('Error fetching scheduled runs:', err);
    }
  };


  const handleDeleteClub = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/clubs/${id}`);
      alert('Club deleted successfully');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting club:', err);
      alert(err.response?.data?.error || 'Failed to delete club');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEditScheduledRun = (run) => {
    setEditingRun(run);
    setShowScheduleRun(true);
  };

  const handleDeleteScheduledRun = async () => {
    if (!deleteRunConfirm) return;

    try {
      await api.delete(`/runs/schedule/${deleteRunConfirm.id}`);
      setDeleteRunConfirm(null);
      fetchScheduledRuns();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete scheduled run');
      setDeleteRunConfirm(null);
    }
  };

  if (!club) return <div className="loading">Loading...</div>;

  return (
    <div className="club-detail-container">
      <div className="club-hero">
        <div className="club-hero-content">
          <h2>{club.name}</h2>
          <p>{club.description || 'Running together, achieving more'}</p>
        </div>
      </div>

      <header className="club-header">
        <div className="header-actions">
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
          <div className="header-right-actions">
            {club.is_creator && (
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="delete-button"
              >
                Delete Club
              </button>
            )}
            {!club.is_creator && (
              <button className="leave-button">Leave Club</button>
            )}
          </div>
        </div>
      </header>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Club</h2>
            <p>Are you sure you want to delete <strong>{club.name}</strong>?</p>
            <p className="warning-text">This action cannot be undone. All club data, scheduled runs, and activities will be permanently deleted.</p>
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setIsDeleting(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDeleteClub}
                className="delete-confirm-button"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Club'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteRunConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteRunConfirm(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Scheduled Run</h2>
            <p>Are you sure you want to delete this scheduled run?</p>
            <div className="run-preview">
              <p><strong>Title:</strong> {deleteRunConfirm.title}</p>
              <p><strong>Date:</strong> {new Date(deleteRunConfirm.scheduled_date).toLocaleString()}</p>
              {deleteRunConfirm.location && <p><strong>Location:</strong> {deleteRunConfirm.location}</p>}
            </div>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setDeleteRunConfirm(null)}>Cancel</button>
              <button type="button" onClick={handleDeleteScheduledRun} className="delete-confirm-button">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="club-info-section">
        <div className="club-meta-info">
          {club.location && (
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <span>{club.location}</span>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-icon">👥</span>
            <span>{club.member_count} members</span>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            <span className="tab-icon">📅</span>
            Scheduled Runs
          </button>
          <button
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <span className="tab-icon">📝</span>
            Activity Feed
          </button>
          <button
            className={`tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <span className="tab-icon">👥</span>
            Members
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'scheduled' && (
            <div className="scheduled-runs-section">
              <div className="section-header">
                <button onClick={() => setShowScheduleRun(true)} className="schedule-button">
                  <span>+</span> Schedule Run
                </button>
              </div>
              {showScheduleRun && (
                <ScheduleRun
                  clubId={id}
                  initialRun={editingRun}
                  onClose={() => {
                    setShowScheduleRun(false);
                    setEditingRun(null);
                  }}
                  onSuccess={() => {
                    setShowScheduleRun(false);
                    setEditingRun(null);
                    fetchScheduledRuns();
                  }}
                />
              )}
              <div className="scheduled-runs-list">
                {scheduledRuns.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <h3>No scheduled runs</h3>
                    <p>Schedule your first group run!</p>
                  </div>
                ) : (
                  scheduledRuns.map((run) => (
                    <div key={run.id} className="scheduled-run-card">
                      <div className="run-card-header">
                        <div>
                          <h3>{run.title}</h3>
                          {run.description && <p className="run-description">{run.description}</p>}
                        </div>
                        {currentUser && currentUser.id === run.created_by?.id && (
                          <div className="run-card-actions">
                            <button 
                              className="edit-run-button"
                              onClick={() => handleEditScheduledRun(run)}
                              title="Edit scheduled run"
                            >
                              ✏️
                            </button>
                            <button 
                              className="delete-run-button"
                              onClick={() => setDeleteRunConfirm(run)}
                              title="Delete scheduled run"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="run-details">
                        <p>📅 {new Date(run.scheduled_date).toLocaleString()}</p>
                        {run.location && <p>📍 {run.location}</p>}
                        <p>Created by: {run.created_by?.name || 'Unknown'}</p>
                        <p>{run.participant_count} participants</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <ActivityFeed clubId={id} />
          )}

          {activeTab === 'members' && (
            <div className="members-section">
              <div className="members-list">
                {club.members.map((member) => (
                  <div key={member.id} className="member-card">
                    <div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div>
                    <div className="member-info">
                      <h3>{member.name}</h3>
                      <p>{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClubDetail;
