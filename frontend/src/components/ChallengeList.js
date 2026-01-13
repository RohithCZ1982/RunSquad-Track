import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './ChallengeList.css';

function ChallengeList({ clubId, isAdmin, onJoinChallenge }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    fetchChallenges();
  }, [clubId]);

  const fetchChallenges = async () => {
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
  };

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

  const handleViewLeaderboard = async (challengeId) => {
    try {
      const response = await api.get(`/challenges/${challengeId}/leaderboard`);
      setLeaderboard(response.data);
      setSelectedChallenge(challengeId);
      setShowLeaderboard(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch leaderboard');
    }
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
                      className="join-challenge-button"
                      onClick={() => handleJoinChallenge(challenge.id)}
                    >
                      Join Challenge
                    </button>
                  )}
                  {challenge.is_participating && (
                    <button 
                      className="view-leaderboard-button"
                      onClick={() => handleViewLeaderboard(challenge.id)}
                    >
                      View Leaderboard
                    </button>
                  )}
                  {!active && challenge.is_participating && (
                    <button 
                      className="view-leaderboard-button"
                      onClick={() => handleViewLeaderboard(challenge.id)}
                    >
                      View Final Results
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChallengeList;
