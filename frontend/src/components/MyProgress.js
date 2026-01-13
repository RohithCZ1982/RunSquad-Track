import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
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
import './MyProgress.css';

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

function MyProgress() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTrackOptions, setShowTrackOptions] = useState(false);
  const [showGPSTracker, setShowGPSTracker] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [chartType, setChartType] = useState('distance'); // 'distance', 'speed'

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await api.get('/runs/my-progress');
      setRuns(response.data.runs);
      setStatistics(response.data.statistics);
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const handleTrackRun = async (e) => {
    e.preventDefault();

    try {
      let formattedDate = date;
      if (date && !date.includes('Z') && !date.includes('+')) {
        formattedDate = new Date(date).toISOString();
      }

      if (editingRun) {
        // Update existing run
        await api.put(`/runs/${editingRun.id}`, {
          distance_km: parseFloat(distance),
          duration_minutes: parseFloat(duration),
          notes: notes || undefined,
          date: formattedDate || undefined
        });
      } else {
        // Create new run
        await api.post('/runs/track', {
          distance_km: parseFloat(distance),
          duration_minutes: parseFloat(duration),
          notes: notes || undefined,
          date: formattedDate || undefined
        });
      }
      
      setDistance('');
      setDuration('');
      setNotes('');
      setDate('');
      setShowForm(false);
      setEditingRun(null);
      fetchProgress();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${editingRun ? 'update' : 'track'} run`);
    }
  };

  const handleEditRun = (run) => {
    setEditingRun(run);
    setDistance(run.distance_km.toString());
    setDuration(run.duration_minutes.toString());
    setNotes(run.notes || '');
    
    // Format date for datetime-local input
    const runDate = new Date(run.date);
    const year = runDate.getFullYear();
    const month = String(runDate.getMonth() + 1).padStart(2, '0');
    const day = String(runDate.getDate()).padStart(2, '0');
    const hours = String(runDate.getHours()).padStart(2, '0');
    const minutes = String(runDate.getMinutes()).padStart(2, '0');
    setDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    
    setShowForm(true);
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
    setShowForm(false);
    setEditingRun(null);
    setDistance('');
    setDuration('');
    setNotes('');
    setDate('');
  };

  const handleGPSTrack = () => {
    setShowGPSTracker(true);
    setShowTrackOptions(false);
  };

  const handleGPSSave = async (runData) => {
    try {
      await api.post('/runs/track', runData);
      setShowGPSTracker(false);
      fetchProgress();
    } catch (err) {
      console.error('Error saving GPS run:', err);
      throw err; // Re-throw so GPSTracker can handle it
    }
  };

  const handleGPSCancel = () => {
    setShowGPSTracker(false);
  };

  // Prepare chart data - get last 10 runs for better visualization
  const getRecentRuns = () => {
    // Sort runs by date in ascending order (oldest to newest)
    const sortedRuns = [...runs].sort((a, b) => new Date(a.date) - new Date(b.date));
    // Get last 10 runs (most recent 10), or all runs if less than 10
    const runsToShow = sortedRuns.length > 10 ? sortedRuns.slice(-10) : sortedRuns;
    return runsToShow; // Already in ascending order (oldest to newest)
  };

  const getDistanceChartData = () => {
    const recentRuns = getRecentRuns();
    return {
      labels: recentRuns.map(run => {
        const date = new Date(run.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
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
        },
      ],
    };
  };

  const getSpeedChartData = () => {
    const recentRuns = getRecentRuns();
    return {
      labels: recentRuns.map(run => {
        const date = new Date(run.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
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
        },
      ],
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
          font: {
            size: 12,
            weight: '600',
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: '600',
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
          },
        },
        beginAtZero: true,
      },
    },
  });

  return (
    <div className="progress-container">
      <div className="progress-hero">
        <div className="progress-hero-content">
          <h2>My Progress</h2>
          <p>Track your runs and see your achievements</p>
        </div>
      </div>

      <header className="progress-header">
        <button onClick={() => navigate('/dashboard')}>← Back</button>
        <h1>My Progress</h1>
        <button onClick={() => setShowTrackOptions(true)} className="track-run-button">
          <span>+</span> Track Run
        </button>
      </header>

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
                  setShowForm(true);
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

      {showGPSTracker && (
        <div className="modal-overlay" onClick={() => setShowGPSTracker(false)}>
          <div className="gps-tracker-modal" onClick={(e) => e.stopPropagation()}>
            <GPSTracker
              clubId={null}
              onSave={handleGPSSave}
              onCancel={handleGPSCancel}
            />
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

      {showForm && (
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
    </div>
  );
}

export default MyProgress;
