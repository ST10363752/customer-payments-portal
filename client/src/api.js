import axios from 'axios';

// Use different URLs for development vs production
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:5000/api'
  : 'https://customer-payments-portal.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;