import React, { useState } from 'react';
import api from '../utils/api';
import './CreateChallenge.css';

function CreateChallenge({ clubId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState('weekly_mileage');
  const [goalValue, setGoalValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const challengeTypes = [
    { value: 'weekly_mileage', label: 'Weekly Mileage', unit: 'km', description: 'Total distance goal for the week' },
    { value: 'fastest_5k', label: 'Fastest 5K', unit: 'minutes', description: 'Fastest time to complete 5K' },
    { value: 'total_distance', label: 'Total Distance', unit: 'km', description: 'Total distance goal over the period' },
    { value: 'total_time', label: 'Total Time', unit: 'minutes', description: 'Total running time goal' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !goalValue || !startDate || !endDate) {
      setError('Please fill in all required fields');
      return;
    }

    const goal = parseFloat(goalValue);
    if (isNaN(goal) || goal <= 0) {
      setError('Goal value must be a positive number');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      setError('End date must be after start date');
      return;
    }

    setIsSubmitting(true);

    try {
      // Format dates for API
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();

      await api.post(`/challenges/club/${clubId}`, {
        title,
        description: description || undefined,
        challenge_type: challengeType,
        goal_value: goal,
        start_date: startISO,
        end_date: endISO
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create challenge');
      setIsSubmitting(false);
    }
  };

  const selectedType = challengeTypes.find(t => t.value === challengeType);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-challenge-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Challenge</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Challenge Title *</label>
            <input
              type="text"
              placeholder="e.g., Weekly Mileage Goal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Describe the challenge..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Challenge Type *</label>
            <select
              value={challengeType}
              onChange={(e) => setChallengeType(e.target.value)}
              required
            >
              {challengeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {selectedType && (
              <small className="form-hint">{selectedType.description}</small>
            )}
          </div>

          <div className="form-group">
            <label>
              Goal Value ({selectedType?.unit}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder={`Enter goal in ${selectedType?.unit}`}
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              required
            />
            {challengeType === 'fastest_5k' && (
              <small className="form-hint">Enter time in minutes (e.g., 25.5 for 25 minutes 30 seconds)</small>
            )}
            {challengeType === 'total_time' && (
              <small className="form-hint">Enter total time in minutes</small>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChallenge;
