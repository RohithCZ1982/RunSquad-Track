import React, { useState } from 'react';
import api from '../utils/api';
import './EditProfile.css';

function EditProfile({ user, onClose, onSuccess, onLogout }) {
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate password if provided
    if (password) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
    }

    // Validate name
    if (!name || !name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    try {
      const updateData = {
        name: name.trim()
      };

      // Only include password if it's provided
      if (password) {
        updateData.password = password;
      }

      const response = await api.put('/users/profile', updateData);

      if (response.data.password_changed) {
        // Password was changed, log out the user
        alert('Password changed successfully. Please log in again.');
        onLogout();
      } else {
        // Only name was changed, update local storage and close modal
        const updatedUser = { ...user, name: response.data.user.name };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        onSuccess(updatedUser);
        onClose();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              placeholder="Leave empty to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small className="form-hint">Minimum 6 characters</small>
          </div>

          {password && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
