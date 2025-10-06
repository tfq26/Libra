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
export async function sendChatMessage(message, conversationId, token) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          conversationId
        })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
  
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
