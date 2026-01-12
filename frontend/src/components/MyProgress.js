import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
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
  const [editingRun, setEditingRun] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [chartType, setChartType] = useState('distance'); // 'distance', 'speed', 'performance'

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

  // Prepare chart data - get last 10 runs for better visualization
  const getRecentRuns = () => {
    // Get last 10 runs, or all runs if less than 10
    const runsToShow = runs.length > 10 ? runs.slice(0, 10) : runs;
    return runsToShow.reverse(); // Reverse to show oldest first (left to right)
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

  // Calculate performance score (combination of distance and speed)
  const calculatePerformanceScore = (runs) => {
    if (runs.length === 0) return [];
    
    // Normalize distance and speed, then combine them
    const distances = runs.map(r => r.distance_km);
    const speeds = runs.map(r => r.speed_kmh);
    
    const maxDistance = Math.max(...distances);
    const maxSpeed = Math.max(...speeds);
    const minDistance = Math.min(...distances);
    const minSpeed = Math.min(...speeds);
    
    // Calculate performance score: (normalized distance * 0.6) + (normalized speed * 0.4)
    // This gives more weight to distance but also considers speed
    return runs.map((run, index) => {
      const normalizedDistance = maxDistance > minDistance 
        ? ((run.distance_km - minDistance) / (maxDistance - minDistance)) * 100
        : 50;
      const normalizedSpeed = maxSpeed > minSpeed
        ? ((run.speed_kmh - minSpeed) / (maxSpeed - minSpeed)) * 100
        : 50;
      
      return {
        score: (normalizedDistance * 0.6) + (normalizedSpeed * 0.4),
        date: run.date,
        index: index
      };
    });
  };

  const getPerformanceTrendData = () => {
    const recentRuns = getRecentRuns();
    if (recentRuns.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    const performanceScores = calculatePerformanceScore(recentRuns);
    const scores = performanceScores.map(p => p.score);
    
    // Calculate trend (improving or declining)
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const isImproving = secondAvg > firstAvg;
    
    // Determine color based on trend
    const lineColor = isImproving ? '#10b981' : '#ef4444';
    const fillColor = isImproving ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    
    return {
      labels: recentRuns.map(run => {
        const date = new Date(run.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Performance Score',
          data: scores,
          borderColor: lineColor,
          backgroundColor: fillColor,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: lineColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        },
        // Add trend line (average)
        {
          label: 'Average',
          data: scores.map(() => scores.reduce((a, b) => a + b, 0) / scores.length),
          borderColor: '#6b7280',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };
  };
  
  const getPerformanceInfo = () => {
    const recentRuns = getRecentRuns();
    if (recentRuns.length < 2) return null;
    
    const performanceScores = calculatePerformanceScore(recentRuns);
    const scores = performanceScores.map(p => p.score);
    
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    const isImproving = change > 0;
    
    return {
      isImproving,
      change: Math.abs(change).toFixed(1),
      trend: isImproving ? 'Improving' : 'Declining'
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

  const getPerformanceChartOptions = () => {
    return {
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
            filter: (item) => item.text !== 'Average' || performanceInfo !== null,
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
          callbacks: {
            label: (context) => {
              if (context.datasetIndex === 0) {
                return `Performance: ${context.parsed.y.toFixed(1)}`;
              }
              return `Average: ${context.parsed.y.toFixed(1)}`;
            }
          }
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
          beginAtZero: false,
          min: 0,
          max: 100,
        },
      },
    };
  };

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
        <button onClick={() => setShowForm(true)} className="primary-button">
          Track Run
        </button>
      </header>

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
              <button
                className={chartType === 'performance' ? 'active' : ''}
                onClick={() => setChartType('performance')}
              >
                Performance
              </button>
            </div>
          </div>
          {chartType === 'performance' && getPerformanceInfo() && (
            <div className="performance-indicator">
              <div className={`performance-badge ${getPerformanceInfo().isImproving ? 'improving' : 'declining'}`}>
                <span className="performance-icon">
                  {getPerformanceInfo().isImproving ? '📈' : '📉'}
                </span>
                <div className="performance-text">
                  <span className="performance-trend">{getPerformanceInfo().trend}</span>
                  <span className="performance-change">
                    {getPerformanceInfo().isImproving ? '+' : '-'}{getPerformanceInfo().change}%
                  </span>
                </div>
              </div>
              <p className="performance-description">
                {getPerformanceInfo().isImproving 
                  ? 'Your performance is improving! Keep up the great work! 🎉'
                  : 'Your performance has declined. Consider adjusting your training routine.'}
              </p>
            </div>
          )}
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
            {chartType === 'performance' && (
              <Line
                data={getPerformanceTrendData()}
                options={getPerformanceChartOptions()}
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
