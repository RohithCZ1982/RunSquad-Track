import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './BulkImportUsers.css';

function BulkImportUsers() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an Excel file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/users/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      setFile(null);
      // Reset file input
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import users. Please check your file format.');
      if (err.response?.data?.details) {
        console.error('Error details:', err.response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="bulk-import-container">
      <div className="bulk-import-header">
        <button className="back-button" onClick={handleBack}>
          ← Back to Dashboard
        </button>
        <h1>Bulk Import Users</h1>
      </div>

      <div className="bulk-import-content">
        <div className="instructions-box">
          <h2>Instructions</h2>
          <p>Upload an Excel file (.xlsx or .xls) with the following columns:</p>
          <ul>
            <li><strong>name</strong> (required) - User's full name</li>
            <li><strong>email</strong> (required) - User's email address</li>
            <li><strong>password</strong> (required) - User's password</li>
            <li><strong>address</strong> (optional) - User's address</li>
          </ul>
          <p className="note">
            <strong>Note:</strong> Column names are case-insensitive. Users with existing emails will be skipped.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-group">
            <label htmlFor="excel-file" className="file-label">
              Select Excel File
            </label>
            <input
              type="file"
              id="excel-file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="file-input"
              disabled={loading}
            />
            {file && (
              <div className="file-info">
                <span className="file-name">Selected: {file.name}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={!file || loading}
          >
            {loading ? 'Importing...' : 'Import Users'}
          </button>
        </form>

        {result && (
          <div className="result-box">
            <h2>Import Results</h2>
            <div className="result-summary">
              <div className="result-item success">
                <span className="result-label">Created:</span>
                <span className="result-value">{result.created_count || 0}</span>
              </div>
              <div className="result-item warning">
                <span className="result-label">Skipped:</span>
                <span className="result-value">{result.skipped_count || 0}</span>
              </div>
              <div className="result-item error">
                <span className="result-label">Errors:</span>
                <span className="result-value">{result.error_count || 0}</span>
              </div>
            </div>

            {result.created_users && result.created_users.length > 0 && (
              <div className="result-details">
                <h3>Created Users ({result.created_users.length})</h3>
                <div className="users-list">
                  {result.created_users.map((user, index) => (
                    <div key={index} className="user-item">
                      <span className="user-name">{user.name}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.skipped_users && result.skipped_users.length > 0 && (
              <div className="result-details">
                <h3>Skipped Users ({result.skipped_users.length})</h3>
                <div className="users-list">
                  {result.skipped_users.map((user, index) => (
                    <div key={index} className="user-item skipped">
                      <span className="user-email">{user.email}</span>
                      <span className="skip-reason">{user.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="result-details">
                <h3>Errors ({result.errors.length})</h3>
                <div className="errors-list">
                  {result.errors.map((error, index) => (
                    <div key={index} className="error-item">
                      <span className="error-row">Row {error.row}:</span>
                      <span className="error-message">{error.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkImportUsers;
