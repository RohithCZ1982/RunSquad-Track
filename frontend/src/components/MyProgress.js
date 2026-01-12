import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './MyProgress.css';

function MyProgress() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

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
      await api.post('/runs/track', {
        distance_km: parseFloat(distance),
        duration_minutes: parseFloat(duration),
        notes
      });
      setDistance('');
      setDuration('');
      setNotes('');
      setShowForm(false);
      fetchProgress();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to track run');
    }
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

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Track Run</h2>
            <form onSubmit={handleTrackRun}>
              <input
                type="number"
                step="0.01"
                placeholder="Distance (km) *"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Duration (minutes) *"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
              <textarea
                placeholder="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
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
                <span className="speed-badge">{run.speed_kmh} km/h</span>
              </div>
              <div className="run-details">
                <p>Distance: {run.distance_km} km</p>
                <p>Duration: {run.duration_minutes} minutes</p>
                {run.notes && <p>Notes: {run.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyProgress;
