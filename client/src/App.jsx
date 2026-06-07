import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Portal from './pages/Portal';
import api from './api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/me');
        if (response.data.employee) {
          setIsAuthenticated(true);
          setEmployee(response.data.employee);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (employeeData) => {
    setIsAuthenticated(true);
    setEmployee(employeeData);
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
      setIsAuthenticated(false);
      setEmployee(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading secure employee portal...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/portal" />} 
          />
          <Route 
            path="/portal/*" 
            element={isAuthenticated ? <Portal user={employee} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;