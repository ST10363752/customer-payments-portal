import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import MakePayment from './MakePayment';
import PaymentHistory from './PaymentHistory';
import './Portal.css';

const Portal = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate('/login');
  };

  return (
    <div className="portal-container">
      <nav className="portal-nav">
        <div className="nav-brand">
          <h2>🏦 Employee International Payments Portal</h2>
        </div>
        <div className="nav-links">
          <Link to="/portal">Dashboard</Link>
          <Link to="/portal/payment">Make Payment</Link>
          <Link to="/portal/history">History</Link>
        </div>
        <div className="nav-user">
          <span>Welcome, {user?.fullName?.split(' ')[0] || 'Employee'}</span>
          <span className="role-badge">{user?.role || 'Employee'}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>
      
      <div className="portal-content">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/payment" element={<MakePayment user={user} />} />
          <Route path="/history" element={<PaymentHistory />} />
        </Routes>
      </div>
    </div>
  );
};

export default Portal;