import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { convertLocalToIST, convertISTToLocal } from '../utils/dateUtils';
import './ScheduleRun.css';

function ScheduleRun({ clubId, onClose, onSuccess, initialRun = null }) {
  const [title, setTitle] = useState(initialRun?.title || '');
  const [description, setDescription] = useState(initialRun?.description || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [location, setLocation] = useState(initialRun?.location || '');
  const [error, setError] = useState('');

  // Set initial date when editing
  useEffect(() => {
    if (initialRun && initialRun.scheduled_date) {
      // Convert IST ISO string to datetime-local format
      setScheduledDate(convertISTToLocal(initialRun.scheduled_date));
    } else if (!initialRun) {
      // Set default to current IST time for new runs
      const now = new Date();
      // Get IST time (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
      const istTime = new Date(now.getTime() + istOffset);
      const year = istTime.getUTCFullYear();
      const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istTime.getUTCDate()).padStart(2, '0');
      const hours = String(istTime.getUTCHours()).padStart(2, '0');
      const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
      setScheduledDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [initialRun]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Convert datetime-local format to IST ISO format
      // The datetime-local input is treated as IST time
      const formattedDate = convertLocalToIST(scheduledDate);
      
      if (!formattedDate) {
        throw new Error('Invalid date format');
      }

      if (initialRun) {
        // Update existing scheduled run
        await api.put(`/runs/schedule/${initialRun.id}`, {
          title,
          description,
          scheduled_date: formattedDate,
          location
        });
      } else {
        // Create new scheduled run
        await api.post('/runs/schedule', {
          club_id: parseInt(clubId),
          title,
          description,
          scheduled_date: formattedDate,
          location
        });
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error scheduling run:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to schedule run');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{initialRun ? 'Edit Scheduled Run' : 'Schedule Run'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
          />
          <input
            type="datetime-local"
            placeholder="Scheduled Date *"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Location (Optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">{initialRun ? 'Update' : 'Schedule'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleRun;
