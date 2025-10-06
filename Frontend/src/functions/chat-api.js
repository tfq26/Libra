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
    // Add auth token if available
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

/**
 * Fetch conversation history for a user
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of conversation objects
 */
export async function fetchConversationHistory(userId) {
  try {
    const response = await api.get('/history', { params: { userId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
}

/**
 * Load a specific conversation
 * @param {string} conversationId - The ID of the conversation to load
 * @returns {Promise<Object>} The conversation object
 */
export async function loadConversation(conversationId) {
  try {
    const response = await api.get('/chat', { params: { id: conversationId } });
    return response.data;
  } catch (error) {
    console.error('Error loading conversation:', error);
    throw error;
  }
}

/**
 * Send a chat message
 * @param {string} message - The message text
 * @param {string|null} conversationId - Optional conversation ID for continuing a conversation
 * @returns {Promise<Object>} The updated conversation object
 */
export async function sendChatMessage(message, conversationId = null) {
  try {
    const response = await api.post('/chat', {
      message,
      conversationId,
      timestamp: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Handle specific error cases
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        // Handle unauthorized (e.g., redirect to login)
        console.error('Authentication required');
      } else if (error.response.status === 429) {
        // Handle rate limiting
        console.error('Rate limit exceeded');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from server');
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    throw error;
  }
}
