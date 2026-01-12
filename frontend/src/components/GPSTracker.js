import React, { useState, useEffect, useRef } from 'react';
import './GPSTracker.css';

function GPSTracker({ clubId, onSave, onCancel }) {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0); // in km
  const [duration, setDuration] = useState(0); // in seconds
  const [pace, setPace] = useState(0); // minutes per km
  const [speed, setSpeed] = useState(0); // km/h
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  const watchIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const intervalRef = useRef(null);
  const lastLocationRef = useRef(null);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance
  const formatDistance = (km) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)} m`;
    }
    return `${km.toFixed(2)} km`;
  };

  // Format pace (minutes per km)
  const formatPace = (minutesPerKm) => {
    if (minutesPerKm === 0 || !isFinite(minutesPerKm)) return '--:--';
    const mins = Math.floor(minutesPerKm);
    const secs = Math.floor((minutesPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError('');
    setIsTracking(true);
    setIsPaused(false);
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    pausedTimeRef.current = 0;

    // Request high accuracy for better GPS tracking
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    // Watch position updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Filter out inaccurate readings (accuracy > 50 meters)
        if (accuracy > 50) {
          console.warn('GPS accuracy low:', accuracy, 'meters');
          return;
        }

        const newLocation = {
          lat: latitude,
          lon: longitude,
          timestamp: Date.now(),
          accuracy
        };

        setLocations(prev => [...prev, newLocation]);

        // Calculate distance if we have a previous location
        if (lastLocationRef.current) {
          const dist = calculateDistance(
            lastLocationRef.current.lat,
            lastLocationRef.current.lon,
            latitude,
            longitude
          );
          
          // Only add distance if it's reasonable (filter out GPS jumps)
          if (dist < 0.1) { // Less than 100m between points
            setDistance(prev => prev + dist);
          }
        }

        lastLocationRef.current = newLocation;
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(`GPS Error: ${err.message}`);
        if (err.code === 1) {
          setError('Location access denied. Please enable location permissions.');
        } else if (err.code === 2) {
          setError('Location unavailable. Check your GPS signal.');
        } else if (err.code === 3) {
          setError('Location request timeout. Check your GPS signal.');
        }
      },
      options
    );

    // Update timer
    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
        
        // Calculate pace and speed
        if (distance > 0) {
          const paceMinutes = (elapsed / 60) / distance;
          setPace(paceMinutes);
          const speedKmh = (distance / elapsed) * 3600;
          setSpeed(speedKmh);
        }
      }
    }, 1000);
  };

  // Pause tracking
  const pauseTracking = () => {
    setIsPaused(true);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    pausedTimeRef.current = Date.now() - startTimeRef.current;
  };

  // Resume tracking
  const resumeTracking = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        if (accuracy > 50) {
          return;
        }

        const newLocation = {
          lat: latitude,
          lon: longitude,
          timestamp: Date.now(),
          accuracy
        };

        setLocations(prev => [...prev, newLocation]);

        if (lastLocationRef.current) {
          const dist = calculateDistance(
            lastLocationRef.current.lat,
            lastLocationRef.current.lon,
            latitude,
            longitude
          );
          
          if (dist < 0.1) {
            setDistance(prev => prev + dist);
          }
        }

        lastLocationRef.current = newLocation;
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(`GPS Error: ${err.message}`);
      },
      options
    );
  };

  // Stop tracking
  const stopTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Save run
  const handleSave = async () => {
    if (distance < 0.01) {
      setError('Distance too short. Please track at least 10 meters.');
      return;
    }

    const durationMinutes = duration / 60;
    
    try {
      await onSave({
        distance_km: distance,
        duration_minutes: durationMinutes,
        notes: notes || undefined,
        date: new Date().toISOString()
      });
      
      // Reset
      stopTracking();
      setDistance(0);
      setDuration(0);
      setPace(0);
      setSpeed(0);
      setLocations([]);
      setNotes('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save run');
    }
  };

  // Discard run
  const handleDiscard = () => {
    if (window.confirm('Are you sure you want to discard this run?')) {
      stopTracking();
      setDistance(0);
      setDuration(0);
      setPace(0);
      setSpeed(0);
      setLocations([]);
      setNotes('');
      setError('');
      onCancel();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="gps-tracker">
      <div className="gps-tracker-header">
        <h3>GPS Run Tracker</h3>
        <button className="close-button" onClick={handleDiscard}>×</button>
      </div>

      {error && <div className="gps-error">{error}</div>}

      <div className="gps-stats">
        <div className="gps-stat-card">
          <div className="stat-label">Distance</div>
          <div className="stat-value">{formatDistance(distance)}</div>
        </div>
        <div className="gps-stat-card">
          <div className="stat-label">Time</div>
          <div className="stat-value">{formatTime(duration)}</div>
        </div>
        <div className="gps-stat-card">
          <div className="stat-label">Pace</div>
          <div className="stat-value">{formatPace(pace)}</div>
        </div>
        <div className="gps-stat-card">
          <div className="stat-label">Speed</div>
          <div className="stat-value">{speed.toFixed(1)} km/h</div>
        </div>
      </div>

      <div className="gps-controls">
        {!isTracking ? (
          <button className="gps-button start-button" onClick={startTracking}>
            ▶ Start Run
          </button>
        ) : isPaused ? (
          <>
            <button className="gps-button resume-button" onClick={resumeTracking}>
              ▶ Resume
            </button>
            <button className="gps-button stop-button" onClick={stopTracking}>
              ⏹ Stop
            </button>
          </>
        ) : (
          <>
            <button className="gps-button pause-button" onClick={pauseTracking}>
              ⏸ Pause
            </button>
            <button className="gps-button stop-button" onClick={stopTracking}>
              ⏹ Stop
            </button>
          </>
        )}
      </div>

      {isTracking && (
        <div className="gps-status">
          <div className={`status-indicator ${isPaused ? 'paused' : 'active'}`}>
            <span className="status-dot"></span>
            {isPaused ? 'Paused' : 'Tracking...'}
          </div>
          <div className="location-count">
            {locations.length} GPS points recorded
          </div>
        </div>
      )}

      {!isTracking && distance > 0 && (
        <div className="gps-save-section">
          <textarea
            className="gps-notes"
            placeholder="Add notes about your run (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
          />
          <div className="gps-save-actions">
            <button className="save-button" onClick={handleSave}>
              💾 Save Run
            </button>
            <button className="discard-button" onClick={handleDiscard}>
              🗑️ Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GPSTracker;
