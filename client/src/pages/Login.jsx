import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Login = ({ onLogin }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { employeeId, password });
      if (response.data.success) {
        onLogin(response.data.employee);
        navigate('/portal');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Employee Portal</h2>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
          Secure International Payments Portal
        </p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Employee ID</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g., EMP001"
              required
            />
            <small style={{ color: '#666', fontSize: '12px' }}>Format: EMP001, EMP002, or EMP003</small>
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="form-footer" style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '12px', color: '#999' }}>
            This is an employee-only portal. No registration available.
            <br />
            Contact your administrator for credentials.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;