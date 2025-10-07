import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies/auth
});

// Add a request interceptor to add auth tokens if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ----------------------------------------------------------------------
// Fetch Conversation History (remains the same)
// ----------------------------------------------------------------------
export async function fetchConversationHistory(userId) {
  try {
    const response = await api.get('/history', { params: { userId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// Load Conversation (GET)
// ----------------------------------------------------------------------
/**
 * @param {string} conversationId 
 * @param {string} token 
 * @param {string} userId - Used as the partition key on the backend
 */
export async function loadConversation(conversationId, token, userId) { 
  try {
    const response = await api.get('/conversation', { 
      headers: {
        'Authorization': `Bearer ${token}` 
      },
      params: { 
        id: conversationId,
        userId: userId 
      } 
    });
    return response.data;
  } catch (error) {
    console.error('Error loading conversation:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// Send Chat Message (POST)
// ----------------------------------------------------------------------
/**
 * @param {string} message 
 * @param {string|null} conversationId 
 * @param {string} token 
 * @param {string} userId 
 */
export async function sendChatMessage(message, conversationId, token, userId) {
    try {
      const response = await api.post('/conversation', {
        message,
        conversationId,
        userId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(`API Error ${error.response.status}:`, error.response.data);
        throw new Error(error.response.data.message || `API call failed with status ${error.response.status}`);
      }
      console.error('API Error:', error);
      throw new Error(error.message || 'Network or client error during message send.');
    }
}