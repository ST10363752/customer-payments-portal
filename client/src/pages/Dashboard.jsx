import React, { useState, useEffect } from 'react';
import api from '../api';

const Dashboard = ({ user }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await api.get('/balance');
        setBalance(response.data);
      } catch (error) {
        console.error('Balance fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, []);

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.fullName}!</h1>
      
      <div className="balance-card">
        <h3>Available Balance</h3>
        {loading ? (
          <div className="balance-loading">Loading...</div>
        ) : (
          <div className="balance-amount">
            ${balance?.balance?.toLocaleString() || '0'}
          </div>
        )}
        <p className="account-info">Account: {user?.accountNumber}</p>
      </div>
      
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <a href="/portal/payment" className="action-btn primary">
            💸 Make International Payment
          </a>
          <a href="/portal/history" className="action-btn secondary">
            📜 View Payment History
          </a>
        </div>
      </div>
      
      <div className="security-badge">
        <p>🔒 This is a secure connection. All transactions are encrypted.</p>
      </div>
    </div>
  );
};

export default Dashboard;