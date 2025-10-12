import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/auth';

// Create a single, configured axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Use an interceptor to add the auth token to every request
api.interceptors.request.use(
  async (config) => {
    const authStore = useAuthStore();
    
    if (authStore.isAuthenticated) {
      try {
        const token = await authStore.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Interceptor failed to get auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;