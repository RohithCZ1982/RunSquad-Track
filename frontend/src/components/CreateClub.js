import React, { useState } from 'react';
import api from '../utils/api';
import './CreateClub.css';

function CreateClub({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/clubs', { name, description, location });
      onSuccess();
    } catch (err) {
      console.error('Error creating club:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.msg || 
                          err.message || 
                          'Failed to create club';
      setError(errorMessage);
      
      // If token is invalid, redirect to login
      if (err.response?.status === 401 || err.response?.status === 422) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create Club</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Club Name *</label>
            <input
              type="text"
              placeholder="Enter club name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Enter club description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
            />
          </div>
          <div className="form-group">
            <label>Location (Optional)</label>
            <input
              type="text"
              placeholder="Enter location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateClub;
