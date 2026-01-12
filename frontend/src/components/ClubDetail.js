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
  const [todayStats, setTodayStats] = useState({ totalDistance: 0, activeRunners: 0, runners: [] });
  const [showScheduleRun, setShowScheduleRun] = useState(false);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchClub();
    fetchScheduledRuns();
    fetchTodayStats();
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

  const fetchTodayStats = async () => {
    try {
      // Fetch activity feed to get today's activities
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      try {
        const activitiesResponse = await api.get(`/users/activity-feed/${id}`);
        const activities = activitiesResponse.data || [];
        
        // Filter today's run activities
        const todayActivities = activities.filter(activity => {
          if (activity.activity_type !== 'run') return false;
          const activityDate = new Date(activity.created_at);
          return activityDate >= today;
        });

        // Extract run data from activity descriptions
        let totalDistance = 0;
        const runnersMap = new Map();

        todayActivities.forEach(activity => {
          // Parse description like "John ran 5.2 km at 10.5 km/h"
          const match = activity.description.match(/(\w+)\s+ran\s+([\d.]+)\s+km\s+at\s+([\d.]+)\s+km\/h/);
          if (match) {
            const [, name, distance, speed] = match;
            const distanceNum = parseFloat(distance);
            const speedNum = parseFloat(speed);
            const pace = (60 / speedNum).toFixed(1); // Convert km/h to min/km
            
            totalDistance += distanceNum;
            
            if (runnersMap.has(activity.user_id)) {
              const existing = runnersMap.get(activity.user_id);
              existing.distance += distanceNum;
              existing.runs += 1;
            } else {
              runnersMap.set(activity.user_id, {
                id: activity.user_id,
                name: name,
                distance: distanceNum,
                runs: 1,
                avgPace: pace
              });
            }
          }
        });

        setTodayStats({
          totalDistance: totalDistance.toFixed(1),
          activeRunners: runnersMap.size,
          runners: Array.from(runnersMap.values()).sort((a, b) => b.distance - a.distance)
        });
      } catch (err) {
        // If activity feed fails, set default values
        console.log('Could not fetch activity feed for stats:', err);
        setTodayStats({ totalDistance: '0', activeRunners: 0, runners: [] });
      }
    } catch (err) {
      console.error('Error fetching today stats:', err);
      setTodayStats({ totalDistance: '0', activeRunners: 0, runners: [] });
    }
  };

  useEffect(() => {
    if (club) {
      fetchTodayStats();
    }
  }, [club]);

  const getTodayDate = () => {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
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

      <div className="running-report-card">
        <div className="report-header">
          <div className="report-title">
            <span className="report-icon">📊</span>
            <h2>Today's Running Report</h2>
          </div>
          <p className="report-date">{getTodayDate()}</p>
        </div>
        <div className="report-stats">
          <div className="stat-box">
            <p className="stat-label">Total Distance Today</p>
            <p className="stat-value">{todayStats.totalDistance} km</p>
          </div>
          <div className="stat-box">
            <p className="stat-label">Active Runners</p>
            <p className="stat-value">{todayStats.activeRunners}</p>
          </div>
        </div>
        {todayStats.runners.length > 0 && (
          <div className="today-runners">
            <h4>Today's Runners</h4>
            <div className="runners-list">
              {todayStats.runners.map((runner, index) => (
                <div key={runner.id} className="runner-item">
                  <div className="runner-rank">#{index + 1}</div>
                  <div className="runner-info">
                    <p className="runner-name">{runner.name}</p>
                    <p className="runner-details">{runner.runs} runs • {runner.avgPace} min/km pace</p>
                  </div>
                  <div className="runner-stats">
                    <p className="runner-distance">{runner.distance} km</p>
                    <p className="runner-time">~{Math.round(runner.distance * parseFloat(runner.avgPace))} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
                  onClose={() => setShowScheduleRun(false)}
                  onSuccess={() => {
                    setShowScheduleRun(false);
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
                      <h3>{run.title}</h3>
                      {run.description && <p className="run-description">{run.description}</p>}
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
