import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import GPSTracker from './GPSTracker';
import CreateChallenge from './CreateChallenge';
import './ChallengeList.css';

function ChallengeList({ clubId, isAdmin, onJoinChallenge }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [showTrackOptions, setShowTrackOptions] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showGPSTracker, setShowGPSTracker] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [progressValue, setProgressValue] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [progressImage, setProgressImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [editingChallenge, setEditingChallenge] = useState(null);

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/challenges/club/${clubId}`);
      setChallenges(response.data);
    } catch (err) {
      console.error('Error fetching challenges:', err);
      alert(err.response?.data?.error || 'Failed to fetch challenges');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchChallenges();
  }, [clubId, fetchChallenges]);

  const handleJoinChallenge = async (challengeId) => {
    try {
      await api.post(`/challenges/${challengeId}/join`);
      alert('Successfully joined challenge!');
      fetchChallenges();
      if (onJoinChallenge) {
        onJoinChallenge(challengeId);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join challenge');
    }
  };

  const handleLeaveChallenge = async (challengeId) => {
    if (!window.confirm('Are you sure you want to exit this challenge? Your progress will be lost.')) {
      return;
    }

    try {
      await api.post(`/challenges/${challengeId}/leave`);
      alert('Successfully left challenge!');
      fetchChallenges();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to leave challenge');
    }
  };

  const handleViewLeaderboard = async (challengeId) => {
    try {
      const response = await api.get(`/challenges/${challengeId}/leaderboard`);
      setLeaderboard(response.data);
      setShowLeaderboard(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch leaderboard');
    }
  };

  const handleTrackProgress = (challenge) => {
    setSelectedChallenge(challenge);
    setProgressValue('');
    setProgressNotes('');
    setProgressImage(null);
    setImagePreview(null);
    setTrackError('');
    setShowTrackOptions(true);
  };

  const handleManualTrack = () => {
    setShowTrackOptions(false);
    setShowManualForm(true);
  };

  const handleGPSTrack = () => {
    setShowTrackOptions(false);
    setShowGPSTracker(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setTrackError('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setProgressImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProgress = async (e) => {
    e.preventDefault();
    setTrackError('');

    if (!progressValue || parseFloat(progressValue) <= 0) {
      setTrackError('Please enter a valid progress value');
      return;
    }

    try {
      await api.post(`/challenges/${selectedChallenge.id}/track`, {
        progress_value: parseFloat(progressValue),
        notes: progressNotes || undefined,
        image: progressImage || undefined
      });
      
      alert('Progress tracked successfully!');
      setShowManualForm(false);
      fetchChallenges();
    } catch (err) {
      setTrackError(err.response?.data?.error || 'Failed to track progress');
    }
  };

  const handleGPSSave = async (runData) => {
    try {
      // Calculate progress value based on challenge type
      let progressValue = 0;
      if (selectedChallenge.challenge_type === 'fastest_5k') {
        // For fastest 5K, use time in minutes (lower is better)
        // Only count if distance is close to 5K (4.5-5.5km)
        if (runData.distance_km >= 4.5 && runData.distance_km <= 5.5) {
          progressValue = runData.duration_minutes;
        } else {
          alert('For fastest 5K challenge, your run must be between 4.5km and 5.5km');
          return;
        }
      } else if (selectedChallenge.challenge_type === 'total_distance' || selectedChallenge.challenge_type === 'weekly_mileage') {
        // For distance challenges, use distance in km
        progressValue = runData.distance_km;
      } else if (selectedChallenge.challenge_type === 'total_time') {
        // For time challenges, use duration in minutes
        progressValue = runData.duration_minutes;
      }

      await api.post(`/challenges/${selectedChallenge.id}/track`, {
        progress_value: progressValue,
        notes: runData.notes || undefined
      });

      alert('Progress tracked successfully!');
      setShowGPSTracker(false);
      fetchChallenges();
    } catch (err) {
      console.error('Error saving GPS challenge progress:', err);
      alert(err.response?.data?.error || 'Failed to track progress');
    }
  };

  const handleGPSCancel = () => {
    setShowGPSTracker(false);
  };

  const handleCompleteChallenge = async (challengeId) => {
    if (!window.confirm('Are you sure you want to complete this challenge early? This will end the challenge immediately and finalize all rankings.')) {
      return;
    }

    try {
      await api.post(`/challenges/${challengeId}/complete`);
      alert('Challenge completed successfully!');
      fetchChallenges();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete challenge');
    }
  };

  const handleDeleteChallenge = async (challengeId) => {
    if (!window.confirm('Are you sure you want to delete this challenge? This action cannot be undone and will remove all challenge data including participant progress and leaderboard.')) {
      return;
    }

    try {
      await api.delete(`/challenges/${challengeId}`);
      alert('Challenge deleted successfully!');
      fetchChallenges();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete challenge');
    }
  };

  const handleEditChallenge = (challenge) => {
    setEditingChallenge(challenge);
  };

  const handleChallengeUpdated = () => {
    setEditingChallenge(null);
    fetchChallenges();
  };

  const getProgressLabel = (challengeType) => {
    const labels = {
      'weekly_mileage': 'Distance (km)',
      'fastest_5k': 'Time (minutes)',
      'total_distance': 'Distance (km)',
      'total_time': 'Time (minutes)'
    };
    return labels[challengeType] || 'Progress';
  };

  const getChallengeTypeLabel = (type) => {
    const labels = {
      'weekly_mileage': 'Weekly Mileage',
      'fastest_5k': 'Fastest 5K',
      'total_distance': 'Total Distance',
      'total_time': 'Total Time'
    };
    return labels[type] || type;
  };

  const formatProgress = (challenge) => {
    if (challenge.challenge_type === 'fastest_5k') {
      if (challenge.user_progress === 0) return 'Not completed';
      const minutes = Math.floor(challenge.user_progress);
      const seconds = Math.floor((challenge.user_progress - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else if (challenge.challenge_type === 'total_time') {
      const hours = Math.floor(challenge.user_progress / 60);
      const minutes = Math.floor(challenge.user_progress % 60);
      return `${hours}h ${minutes}m`;
    } else {
      return `${challenge.user_progress.toFixed(2)} km`;
    }
  };

  const formatGoal = (challenge) => {
    if (challenge.challenge_type === 'fastest_5k') {
      const minutes = Math.floor(challenge.goal_value);
      const seconds = Math.floor((challenge.goal_value - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else if (challenge.challenge_type === 'total_time') {
      const hours = Math.floor(challenge.goal_value / 60);
      const minutes = Math.floor(challenge.goal_value % 60);
      return `${hours}h ${minutes}m`;
    } else {
      return `${challenge.goal_value} km`;
    }
  };

  const getProgressPercentage = (challenge) => {
    if (challenge.goal_value === 0) return 0;
    if (challenge.challenge_type === 'fastest_5k') {
      // For fastest 5K, progress is inverted (lower is better)
      if (challenge.user_progress === 0) return 0;
      return Math.min(100, (challenge.goal_value / challenge.user_progress) * 100);
    }
    return Math.min(100, (challenge.user_progress / challenge.goal_value) * 100);
  };

  const isChallengeActive = (challenge) => {
    const now = new Date();
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    // Challenge is active if current time is between start and end (inclusive)
    // Add small buffer to account for timezone differences
    return now >= start && now <= end;
  };

  if (loading) {
    return <div className="challenges-loading">Loading challenges...</div>;
  }

  return (
    <div className="challenge-list-container">
      {showLeaderboard && leaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{leaderboard.challenge_title}</h2>
            <p className="leaderboard-subtitle">
              {getChallengeTypeLabel(leaderboard.challenge_type)} - Goal: {formatGoal({ challenge_type: leaderboard.challenge_type, goal_value: leaderboard.goal_value })}
            </p>
            <div className="leaderboard-list">
              {leaderboard.leaderboard.map((entry) => (
                <div 
                  key={entry.user_id} 
                  className={`leaderboard-entry ${entry.is_current_user ? 'current-user' : ''}`}
                >
                  <div className="leaderboard-rank">#{entry.rank}</div>
                  <div className="leaderboard-user">
                    <div className="leaderboard-name">{entry.user_name}</div>
                    <div className="leaderboard-progress">
                      {formatProgress({ challenge_type: leaderboard.challenge_type, user_progress: entry.progress_value })}
                      {entry.progress_percentage > 0 && (
                        <span className="progress-percentage"> ({entry.progress_percentage}%)</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="close-leaderboard" onClick={() => setShowLeaderboard(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {challenges.length === 0 ? (
        <div className="no-challenges">
          <div className="empty-icon">🏆</div>
          <h3>No challenges yet</h3>
          <p>{isAdmin ? 'Create a challenge to motivate your club members!' : 'Check back later for new challenges.'}</p>
        </div>
      ) : (
        <div className="challenges-grid">
          {challenges.map((challenge) => {
            const active = isChallengeActive(challenge);
            const progressPct = getProgressPercentage(challenge);
            
            return (
              <div key={challenge.id} className={`challenge-card ${!active ? 'inactive' : ''}`}>
                <div className="challenge-header">
                  <h3>{challenge.title}</h3>
                  <span className={`challenge-status ${active ? 'active' : 'ended'}`}>
                    {active ? 'Active' : 'Ended'}
                  </span>
                </div>
                
                {challenge.description && (
                  <p className="challenge-description">{challenge.description}</p>
                )}
                
                <div className="challenge-info">
                  <div className="challenge-type">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{getChallengeTypeLabel(challenge.challenge_type)}</span>
                  </div>
                  <div className="challenge-goal">
                    <span className="info-label">Goal:</span>
                    <span className="info-value">{formatGoal(challenge)}</span>
                  </div>
                  <div className="challenge-dates">
                    <span className="info-label">Period:</span>
                    <span className="info-value">
                      {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="challenge-participants">
                    <span className="info-label">Participants:</span>
                    <span className="info-value">{challenge.participant_count}</span>
                  </div>
                </div>

                {challenge.is_participating && (
                  <div className="challenge-progress-section">
                    <div className="progress-header">
                      <span>Your Progress</span>
                      <span className="progress-text">
                        {formatProgress(challenge)} / {formatGoal(challenge)}
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                    <div className="progress-percentage-text">
                      {progressPct.toFixed(1)}% complete
                    </div>
                  </div>
                )}

                <div className="challenge-actions">
                  {!challenge.is_participating && active && (
                    <button 
                      className="join-challenge-button icon-button"
                      onClick={() => handleJoinChallenge(challenge.id)}
                      title="Join Challenge"
                    >
                      ➕
                    </button>
                  )}
                  {challenge.is_participating && active && (
                    <>
                      <div className="primary-actions">
                        <button 
                          className="track-progress-button icon-button"
                          onClick={() => handleTrackProgress(challenge)}
                          title="Track Progress"
                        >
                          🏃
                        </button>
                        <button 
                          className="view-leaderboard-button icon-button"
                          onClick={() => handleViewLeaderboard(challenge.id)}
                          title="View Leaderboard"
                        >
                          🏆
                        </button>
                      </div>
                      <div className="secondary-actions">
                        <button 
                          className="exit-challenge-button icon-button"
                          onClick={() => handleLeaveChallenge(challenge.id)}
                          title="Exit Challenge"
                        >
                          ❌
                        </button>
                        {isAdmin && (
                          <button 
                            className="complete-challenge-button icon-button"
                            onClick={() => handleCompleteChallenge(challenge.id)}
                            title="Complete Challenge"
                          >
                            ✅
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button 
                              className="edit-challenge-button icon-button"
                              onClick={() => handleEditChallenge(challenge)}
                              title="Edit Challenge"
                            >
                              📝
                            </button>
                            <button 
                              className="delete-challenge-button icon-button"
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              title="Delete Challenge"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  {!active && challenge.is_participating && (
                    <>
                      <div className="primary-actions">
                        <button 
                          className="view-leaderboard-button icon-button"
                          onClick={() => handleViewLeaderboard(challenge.id)}
                          title="View Final Results"
                        >
                          🏆
                        </button>
                      </div>
                      <div className="secondary-actions">
                        <button 
                          className="exit-challenge-button icon-button"
                          onClick={() => handleLeaveChallenge(challenge.id)}
                          title="Exit Challenge"
                        >
                          ❌
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              className="edit-challenge-button icon-button"
                              onClick={() => handleEditChallenge(challenge)}
                              title="Edit Challenge"
                            >
                              📝
                            </button>
                            <button 
                              className="delete-challenge-button icon-button"
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              title="Delete Challenge"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  {isAdmin && active && !challenge.is_participating && (
                    <div className="secondary-actions">
                      <button 
                        className="edit-challenge-button icon-button"
                        onClick={() => handleEditChallenge(challenge)}
                        title="Edit Challenge"
                      >
                        📝
                      </button>
                      <button 
                        className="delete-challenge-button icon-button"
                        onClick={() => handleDeleteChallenge(challenge.id)}
                        title="Delete Challenge"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showTrackOptions && selectedChallenge && (
        <div className="modal-overlay" onClick={() => { setShowTrackOptions(false); }}>
          <div className="track-options-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Track Progress - {selectedChallenge.title}</h3>
            <p>Choose how you want to track your progress:</p>
            <div className="track-options">
              <button 
                className="track-option-button manual"
                onClick={handleManualTrack}
              >
                <span className="option-icon">✏️</span>
                <div>
                  <h4>Track Manually</h4>
                  <p>Enter progress value, notes, and optional image</p>
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
              onClick={() => { setShowTrackOptions(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showManualForm && selectedChallenge && (
        <div className="modal-overlay" onClick={() => { setShowManualForm(false); }}>
          <div className="track-progress-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Track Progress - {selectedChallenge.title}</h2>
              <button className="close-button" onClick={() => { setShowManualForm(false); }}>×</button>
            </div>
            
            {trackError && <div className="error-message">{trackError}</div>}
            
            <form onSubmit={handleSubmitProgress}>
              <div className="form-group">
                <label>{getProgressLabel(selectedChallenge.challenge_type)} *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`Enter ${getProgressLabel(selectedChallenge.challenge_type).toLowerCase()}`}
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  required
                />
                {selectedChallenge.challenge_type === 'fastest_5k' && (
                  <small className="form-hint">Enter time in minutes (e.g., 25.5 for 25 minutes 30 seconds)</small>
                )}
                {selectedChallenge.challenge_type === 'total_time' && (
                  <small className="form-hint">Enter time in minutes</small>
                )}
              </div>
              
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  placeholder="Add notes about your progress..."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button 
                      type="button"
                      className="remove-image-button"
                      onClick={() => {
                        setImagePreview(null);
                        setProgressImage(null);
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
                <small className="form-hint">Maximum file size: 5MB</small>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowManualForm(false); }}>
                  Cancel
                </button>
                <button type="submit">
                  Track Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGPSTracker && selectedChallenge && (
        <div className="modal-overlay" onClick={() => { setShowGPSTracker(false); }}>
          <div className="gps-tracker-modal" onClick={(e) => e.stopPropagation()}>
            <GPSTracker
              clubId={null}
              onSave={handleGPSSave}
              onCancel={handleGPSCancel}
              challengeType={selectedChallenge.challenge_type}
            />
          </div>
        </div>
      )}

      {editingChallenge && (
        <CreateChallenge
          clubId={clubId}
          challenge={editingChallenge}
          onClose={() => setEditingChallenge(null)}
          onSuccess={handleChallengeUpdated}
        />
      )}
    </div>
  );
}

export default ChallengeList;
