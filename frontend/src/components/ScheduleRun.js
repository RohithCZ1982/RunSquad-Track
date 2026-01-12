import React, { useState } from 'react';
import api from '../utils/api';
import './ScheduleRun.css';

function ScheduleRun({ clubId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Convert datetime-local format to ISO format
      let formattedDate = scheduledDate;
      if (scheduledDate && !scheduledDate.includes('Z') && !scheduledDate.includes('+')) {
        // datetime-local format: "2024-01-15T14:30" -> convert to ISO with timezone
        formattedDate = new Date(scheduledDate).toISOString();
      }

      console.log('Scheduling run with data:', {
        club_id: parseInt(clubId),
        title,
        description,
        scheduled_date: formattedDate,
        location
      });

      const response = await api.post('/runs/schedule', {
        club_id: parseInt(clubId),
        title,
        description,
        scheduled_date: formattedDate,
        location
      });
      
      console.log('Schedule run response:', response);
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
        <h2>Schedule Run</h2>
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
            <button type="submit">Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleRun;
