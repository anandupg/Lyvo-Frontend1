import axios from 'axios';

// Dynamically determine the base URL from environment variables
// It should use the Vercel-configured environment variable (VITE_API_URL)
let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Robustness: Remove trailing slash if present
if (apiBase.endsWith('/')) {
  apiBase = apiBase.slice(0, -1);
}

// Robustness: Append /api if missing
// This fixes the issue where VITE_API_URL is set to the root root domain (e.g., https://lyvo-backend1.onrender.com)
if (!apiBase.endsWith('/api')) {
  apiBase = `${apiBase}/api`;
}

const apiClient = axios.create({
  baseURL: apiBase,
  withCredentials: true, // 🚩 CRITICAL FIX: Allows cross-origin cookies and authorization headers
  timeout: 10000,
});

export default apiClient;
