import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import GPSTracker from './GPSTracker';
import './ActivityFeed.css';

function ActivityFeed({ clubId }) {
  const [activities, setActivities] = useState([]);
  const [showTrackOptions, setShowTrackOptions] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showGPSTracker, setShowGPSTracker] = useState(false);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get(`/users/activity-feed/${clubId}`);
      setActivities(response.data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  }, [clubId]);

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
    
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [clubId, fetchActivities]);

  const handleManualTrack = async (e) => {
    e.preventDefault();
    setError('');

    if (!distance || !duration) {
      setError('Distance and duration are required');
      return;
    }

    try {
      // Format date for API
      let formattedDate = date;
      if (date) {
        // If date is provided, convert to ISO format
        formattedDate = new Date(date).toISOString();
      }

      await api.post('/runs/track', {
        distance_km: parseFloat(distance),
        duration_minutes: parseFloat(duration),
        notes: notes || undefined,
        date: formattedDate || undefined,
        club_id: clubId || undefined
      });

      // Reset form
      setDistance('');
      setDuration('');
      setNotes('');
      setDate('');
      setShowManualForm(false);
      setShowTrackOptions(false);
      
      // Refresh activities
      fetchActivities();
    } catch (err) {
      console.error('Error tracking run:', err);
      setError(err.response?.data?.error || 'Failed to track run');
    }
  };

  const handleGPSTrack = () => {
    setShowGPSTracker(true);
    setShowTrackOptions(false);
  };

  const handleGPSSave = async (runData) => {
    try {
      await api.post('/runs/track', {
        ...runData,
        club_id: clubId || undefined
      });
      setShowGPSTracker(false);
      fetchActivities();
    } catch (err) {
      console.error('Error saving GPS run:', err);
      throw err; // Re-throw so GPSTracker can handle it
    }
  };

  const handleGPSCancel = () => {
    setShowGPSTracker(false);
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    if (activity.run_data) {
      setDistance(activity.run_data.distance_km.toString());
      setDuration(activity.run_data.duration_minutes.toString());
      setNotes(activity.run_data.notes || '');
      
      // Format date for datetime-local input
      const runDate = new Date(activity.run_data.date);
      const year = runDate.getFullYear();
      const month = String(runDate.getMonth() + 1).padStart(2, '0');
      const day = String(runDate.getDate()).padStart(2, '0');
      const hours = String(runDate.getHours()).padStart(2, '0');
      const minutes = String(runDate.getMinutes()).padStart(2, '0');
      setDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
    setShowManualForm(true);
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    setError('');

    if (!distance || !duration) {
      setError('Distance and duration are required');
      return;
    }

    try {
      let formattedDate = date;
      if (date) {
        formattedDate = new Date(date).toISOString();
      }

      // Update the activity (which will update the underlying run)
      await api.put(`/users/activities/${editingActivity.id}`, {
        run_data: {
          distance_km: parseFloat(distance),
          duration_minutes: parseFloat(duration),
          notes: notes || undefined,
          date: formattedDate || undefined
        }
      });

      // Reset form
      setDistance('');
      setDuration('');
      setNotes('');
      setDate('');
      setShowManualForm(false);
      setEditingActivity(null);
      setShowTrackOptions(false);
      
      // Refresh activities
      fetchActivities();
    } catch (err) {
      console.error('Error updating activity:', err);
      setError(err.response?.data?.error || 'Failed to update activity');
    }
  };

  const handleDeleteActivity = async () => {
    if (!showDeleteConfirm) return;

    try {
      await api.delete(`/users/activities/${showDeleteConfirm.id}`);
      setShowDeleteConfirm(null);
      fetchActivities();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete activity');
      setShowDeleteConfirm(null);
    }
  };

  const handleCancelForm = () => {
    setShowManualForm(false);
    setEditingActivity(null);
    setDistance('');
    setDuration('');
    setNotes('');
    setDate('');
    setError('');
  };

  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <h2>Activity Feed</h2>
        <button 
          onClick={() => setShowTrackOptions(true)} 
          className="track-run-button"
        >
          <span>+</span> Track Run
        </button>
      </div>

      {showTrackOptions && (
        <div className="modal-overlay" onClick={() => setShowTrackOptions(false)}>
          <div className="track-options-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Track Your Run</h3>
            <p>Choose how you want to track your run:</p>
            <div className="track-options">
              <button 
                className="track-option-button manual"
                onClick={() => {
                  setShowTrackOptions(false);
                  setShowManualForm(true);
                }}
              >
                <span className="option-icon">✏️</span>
                <div>
                  <h4>Track Manually</h4>
                  <p>Enter distance, time, notes, and date</p>
                </div>
              </button>
              <button 
                className="track-option-button gps"
                onClick={handleGPSTrack}
              >
                <span className="option-icon">📍</span>
                <div>
                  <h4>Track Run (GPS)</h4>
                  <p>Use GPS to track your run in real-time</p>
                </div>
              </button>
            </div>
            <button 
              className="close-button"
              onClick={() => setShowTrackOptions(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showManualForm && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingActivity ? 'Edit Run' : 'Track Run Manually'}</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={editingActivity ? handleUpdateActivity : handleManualTrack}>
              <div className="form-group">
                <label>Distance (km) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter distance in kilometers"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Duration (minutes) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Enter duration in minutes"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <small className="form-hint">Leave empty to use current date/time</small>
              </div>
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  placeholder="Add any notes about your run..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="4"
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>
                <button type="submit">{editingActivity ? 'Update' : 'Save Run'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Activity</h2>
            <p>Are you sure you want to delete this activity?</p>
            <div className="activity-preview">
              <p><strong>{showDeleteConfirm.user_name}</strong></p>
              <p>{showDeleteConfirm.description}</p>
              <p className="activity-time-preview">
                {new Date(showDeleteConfirm.created_at).toLocaleString()}
              </p>
            </div>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button type="button" onClick={handleDeleteActivity} className="delete-confirm-button">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showGPSTracker && (
        <div className="modal-overlay" onClick={() => setShowGPSTracker(false)}>
          <div className="gps-tracker-modal" onClick={(e) => e.stopPropagation()}>
            <GPSTracker
              clubId={clubId}
              onSave={handleGPSSave}
              onCancel={handleGPSCancel}
            />
          </div>
        </div>
      )}

      <div className="activities-list">
        {activities.length === 0 ? (
          <div className="no-activities">
            <div className="empty-icon">🏃</div>
            <h3>No runs tracked yet</h3>
            <p>Track your first run manually or using GPS to see it here!</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-content">
                <strong>{activity.user_name}</strong>
                <span> {activity.description}</span>
              </div>
              <div className="activity-footer">
                <div className="activity-time">
                  {new Date(activity.created_at).toLocaleString()}
                </div>
                {currentUser && currentUser.id === activity.user_id && (
                  <div className="activity-actions">
                    <button 
                      className="edit-activity-button"
                      onClick={() => handleEditActivity(activity)}
                      title="Edit activity"
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-activity-button"
                      onClick={() => setShowDeleteConfirm(activity)}
                      title="Delete activity"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;
