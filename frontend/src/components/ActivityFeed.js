import React, { useState, useEffect } from 'react';
import api from '../utils/api';
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

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [clubId]);

  const fetchActivities = async () => {
    try {
      const response = await api.get(`/users/activity-feed/${clubId}`);
      setActivities(response.data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

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
        date: formattedDate || undefined
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
    // Placeholder for GPS tracking (similar to AllTrails)
    // This would require geolocation API and real-time tracking
    setShowGPSTracker(true);
    setShowTrackOptions(false);
    
    // For now, show a message that GPS tracking is coming soon
    alert('GPS tracking feature coming soon! This will allow you to track your run in real-time using your device\'s GPS.');
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
        <div className="modal-overlay" onClick={() => setShowManualForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Track Run Manually</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleManualTrack}>
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
                  onClick={() => {
                    setShowManualForm(false);
                    setDistance('');
                    setDuration('');
                    setNotes('');
                    setDate('');
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit">Save Run</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGPSTracker && (
        <div className="modal-overlay" onClick={() => setShowGPSTracker(false)}>
          <div className="gps-tracker-modal" onClick={(e) => e.stopPropagation()}>
            <h2>GPS Run Tracker</h2>
            <div className="gps-placeholder">
              <div className="gps-icon">📍</div>
              <h3>GPS Tracking Coming Soon</h3>
              <p>This feature will allow you to track your run in real-time using your device's GPS, similar to AllTrails.</p>
              <p>Features will include:</p>
              <ul>
                <li>Real-time distance tracking</li>
                <li>Route mapping</li>
                <li>Pace monitoring</li>
                <li>Automatic time tracking</li>
              </ul>
              <button 
                className="close-button"
                onClick={() => setShowGPSTracker(false)}
              >
                Close
              </button>
            </div>
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
              <div className="activity-time">
                {new Date(activity.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;
