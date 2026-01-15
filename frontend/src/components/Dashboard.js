import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CreateClub from './CreateClub';
import ClubList from './ClubList';
import StylizedText from './StylizedText';
import EditProfile from './EditProfile';
import GPSTracker from './GPSTracker';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Dashboard() {
  const [user, setUser] = useState(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [allClubs, setAllClubs] = useState([]);
  const [badges, setBadges] = useState({ gold: 0, silver: 0, bronze: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('my-clubs');
  const navigate = useNavigate();

  // Tracking tab state
  const [runs, setRuns] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [showTrackOptions, setShowTrackOptions] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showGPSTracker, setShowGPSTracker] = useState(false);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [editingRun, setEditingRun] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [chartType, setChartType] = useState('distance');
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedChallenges, setSelectedChallenges] = useState([]);
  const [userChallenges, setUserChallenges] = useState([]);

  const fetchClubs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      
      const response = await api.get('/clubs');
      if (response && response.data) {
        setAllClubs(response.data);
      }
    } catch (err) {
      console.error('Error fetching clubs:', err);
      if (err.response?.status === 401 || err.response?.status === 422) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
      }
    }
  }, [navigate]);

  const fetchBadges = useCallback(async () => {
    try {
      const response = await api.get('/users/badges');
      setBadges(response.data);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setBadges({ gold: 0, silver: 0, bronze: 0 });
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await api.get('/runs/my-progress');
      setRuns(response.data.runs);
      setStatistics(response.data.statistics);
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  }, []);

  const fetchUserChallenges = useCallback(async () => {
    try {
      const userClubs = allClubs.filter(club => club.is_member || club.is_creator);
      const challengesPromises = userClubs.map(club => 
        api.get(`/challenges/club/${club.id}`).catch(() => ({ data: [] }))
      );
      const challengesResponses = await Promise.all(challengesPromises);
      const allChallenges = challengesResponses.flatMap(res => res.data || []);
      const activeChallenges = allChallenges.filter(ch => {
        const now = new Date();
        const start = new Date(ch.start_date);
        const end = new Date(ch.end_date);
        return ch.is_participating && now >= start && now <= end;
      });
      setUserChallenges(activeChallenges);
    } catch (err) {
      console.error('Error fetching challenges:', err);
    }
  }, [allClubs]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
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

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchProgress();
      fetchUserChallenges();
    }
  }, [activeTab, fetchProgress, fetchUserChallenges]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleTrackRun = async (e) => {
    e.preventDefault();

    try {
      let formattedDate = date;
      if (date && !date.includes('Z') && !date.includes('+')) {
        const [datePart, timePart] = date.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        if (isNaN(localDate.getTime())) {
          throw new Error('Invalid date format');
        }
        formattedDate = localDate.toISOString();
      }

      const runData = {
        distance_km: parseFloat(distance),
        duration_minutes: parseFloat(duration),
        notes: notes || undefined,
        date: formattedDate || undefined,
        club_ids: selectedClubs,
        challenge_ids: selectedChallenges
      };

      if (editingRun) {
        await api.put(`/runs/${editingRun.id}`, runData);
      } else {
        await api.post('/runs/track', runData);
      }
      
      setDistance('');
      setDuration('');
      setNotes('');
      setDate('');
      setSelectedClubs([]);
      setSelectedChallenges([]);
      setShowManualForm(false);
      setEditingRun(null);
      fetchProgress();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${editingRun ? 'update' : 'track'} run`);
    }
  };

  const handleGPSSave = async (runData) => {
    try {
      await api.post('/runs/track', {
        ...runData,
        club_ids: selectedClubs,
        challenge_ids: selectedChallenges
      });
      setShowGPSTracker(false);
      setSelectedClubs([]);
      setSelectedChallenges([]);
      fetchProgress();
    } catch (err) {
      console.error('Error saving GPS run:', err);
      throw err;
    }
  };

  const handleGPSCancel = () => {
    setShowGPSTracker(false);
    setSelectedClubs([]);
    setSelectedChallenges([]);
  };

  const handleEditRun = (run) => {
    setEditingRun(run);
    setDistance(run.distance_km.toString());
    setDuration(run.duration_minutes.toString());
    setNotes(run.notes || '');
    
    const runDate = new Date(run.date);
    const year = runDate.getFullYear();
    const month = String(runDate.getMonth() + 1).padStart(2, '0');
    const day = String(runDate.getDate()).padStart(2, '0');
    const hours = String(runDate.getHours()).padStart(2, '0');
    const minutes = String(runDate.getMinutes()).padStart(2, '0');
    setDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    
    setShowManualForm(true);
  };

  const handleDeleteRun = async () => {
    if (!showDeleteConfirm) return;

    try {
      await api.delete(`/runs/${showDeleteConfirm.id}`);
      setShowDeleteConfirm(null);
      fetchProgress();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete run');
      setShowDeleteConfirm(null);
    }
  };

  const handleCancelForm = () => {
    setShowManualForm(false);
    setEditingRun(null);
    setDistance('');
    setDuration('');
    setNotes('');
    setDate('');
    setSelectedClubs([]);
    setSelectedChallenges([]);
  };

  const getRecentRuns = () => {
    const sortedRuns = [...runs].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sortedRuns.length > 10 ? sortedRuns.slice(-10) : sortedRuns;
  };

  const getDistanceChartData = () => {
    const recentRuns = getRecentRuns();
    return {
      labels: recentRuns.map(run => {
        const date = new Date(run.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Distance (km)',
        data: recentRuns.map(run => run.distance_km),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }],
    };
  };

  const getSpeedChartData = () => {
    const recentRuns = getRecentRuns();
    return {
      labels: recentRuns.map(run => {
        const date = new Date(run.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Speed (km/h)',
        data: recentRuns.map(run => run.speed_kmh),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }],
    };
  };

  const getChartOptions = (title, color) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#6b7280',
          font: { size: 12, weight: '600' },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14, weight: '600' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
        },
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
        },
        beginAtZero: true,
      },
    },
  });

  const userClubs = allClubs.filter(club => club.is_member || club.is_creator);
  const searchResults = searchQuery.trim() 
    ? allClubs.filter(club => 
        !club.is_member && 
        !club.is_creator &&
        (club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (club.location && club.location.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    : [];
  return (
    <div className="dashboard-container">
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
        <button onClick={handleLogout} className="logout-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </header>

      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h2>Your Running Clubs</h2>
          <p>Manage your teams and track activities</p>
        </div>
      </div>

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
        </div>
      </header>

      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${activeTab === 'my-clubs' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-clubs')}
        >
          <span className="tab-icon">🏃</span>
          <span className="tab-text">My Clubs</span>
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'all-clubs' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-clubs')}
        >
          <span className="tab-icon">👥</span>
          <span className="tab-text">All Clubs</span>
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">Tracking</span>
        </button>
      </div>

      <main className="dashboard-main">
        {activeTab === 'my-clubs' && (
          <>
            <div className="dashboard-actions">
              <button onClick={() => setShowCreateClub(true)} className="primary-button">
                Create Club
              </button>
            </div>
            <ClubList clubs={userClubs} onJoin={fetchClubs} searchMode={false} />
          </>
        )}

        {activeTab === 'all-clubs' && (
          <>
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
            <ClubList clubs={searchResults} onJoin={fetchClubs} searchMode={true} />
          </>
        )}

        {activeTab === 'tracking' && (
          <div className="tracking-tab">
            <div className="tracking-header">
              <h2>Tracking</h2>
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
                      onClick={() => {
                        setShowTrackOptions(false);
                        setShowGPSTracker(true);
                      }}
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

            {showGPSTracker && (
              <div className="modal-overlay" onClick={handleGPSCancel}>
                <div className="gps-tracker-modal" onClick={(e) => e.stopPropagation()}>
                  <GPSTracker
                    clubId={null}
                    onSave={handleGPSSave}
                    onCancel={handleGPSCancel}
                  />
                </div>
              </div>
            )}

            {showManualForm && (
              <div className="modal-overlay" onClick={handleCancelForm}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h2>{editingRun ? 'Edit Run' : 'Track Run'}</h2>
                  <form onSubmit={handleTrackRun}>
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
                      <label>Tag to Clubs (Optional)</label>
                      <div className="checkbox-group">
                        {userClubs.map(club => (
                          <label key={club.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedClubs.includes(club.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClubs([...selectedClubs, club.id]);
                                } else {
                                  setSelectedClubs(selectedClubs.filter(id => id !== club.id));
                                }
                              }}
                            />
                            {club.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Tag to Challenges (Optional)</label>
                      <div className="checkbox-group">
                        {userChallenges.map(challenge => (
                          <label key={challenge.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedChallenges.includes(challenge.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChallenges([...selectedChallenges, challenge.id]);
                                } else {
                                  setSelectedChallenges(selectedChallenges.filter(id => id !== challenge.id));
                                }
                              }}
                            />
                            {challenge.title}
                          </label>
                        ))}
                      </div>
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
                      <button type="button" onClick={handleCancelForm}>Cancel</button>
                      <button type="submit">{editingRun ? 'Update' : 'Save'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {statistics && (
              <div className="statistics">
                <div className="stat-card">
                  <h3>Total Runs</h3>
                  <p>{statistics.total_runs}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Distance</h3>
                  <p>{statistics.total_distance_km} km</p>
                </div>
                <div className="stat-card">
                  <h3>Average Speed</h3>
                  <p>{statistics.average_speed_kmh} km/h</p>
                </div>
              </div>
            )}

            {runs.length > 0 && (
              <div className="performance-graph-section">
                <div className="graph-header">
                  <h2>Performance Trends</h2>
                  <div className="chart-type-selector">
                    <button
                      className={chartType === 'distance' ? 'active' : ''}
                      onClick={() => setChartType('distance')}
                    >
                      Distance
                    </button>
                    <button
                      className={chartType === 'speed' ? 'active' : ''}
                      onClick={() => setChartType('speed')}
                    >
                      Speed
                    </button>
                  </div>
                </div>
                <div className="chart-container">
                  {chartType === 'distance' && (
                    <Line
                      data={getDistanceChartData()}
                      options={getChartOptions('Distance (km)', '#3b82f6')}
                    />
                  )}
                  {chartType === 'speed' && (
                    <Line
                      data={getSpeedChartData()}
                      options={getChartOptions('Speed (km/h)', '#10b981')}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="runs-list">
              <h2>Running History</h2>
              {runs.length === 0 ? (
                <p className="no-runs">No runs tracked yet. Start tracking your runs!</p>
              ) : (
                runs.map((run) => (
                  <div key={run.id} className="run-card">
                    <div className="run-header">
                      <h3>{new Date(run.date).toLocaleDateString()}</h3>
                      <span className="speed-badge">{run.speed_kmh.toFixed(1)} km/h</span>
                    </div>
                    <div className="run-details">
                      <p>Distance: {run.distance_km} km</p>
                      <p>Duration: {run.duration_minutes} minutes</p>
                      {run.notes && <p>Notes: {run.notes}</p>}
                    </div>
                    <div className="run-actions">
                      <button 
                        className="edit-button"
                        onClick={() => handleEditRun(run)}
                        title="Edit run"
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => setShowDeleteConfirm(run)}
                        title="Delete run"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {showDeleteConfirm && (
              <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <h2>Delete Run</h2>
                  <p>Are you sure you want to delete this run?</p>
                  <div className="run-preview">
                    <p><strong>Date:</strong> {new Date(showDeleteConfirm.date).toLocaleString()}</p>
                    <p><strong>Distance:</strong> {showDeleteConfirm.distance_km} km</p>
                    <p><strong>Duration:</strong> {showDeleteConfirm.duration_minutes} minutes</p>
                  </div>
                  <p className="warning-text">This action cannot be undone.</p>
                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                    <button type="button" onClick={handleDeleteRun} className="delete-confirm-button">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
      </main>
    </div>
  );
}

export default Dashboard;
