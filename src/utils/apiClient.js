import axios from 'axios';

// Dynamically determine the base URL from environment variables
// It should use the Vercel-configured environment variable (VITE_API_URL)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 🚩 CRITICAL FIX: Allows cross-origin cookies and authorization headers
  timeout: 10000,
});

export default apiClient;
