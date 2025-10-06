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
// NOTE: Interceptor token is for non-Clerk routes (using localStorage token)
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

// ----------------------------------------------------------------------
// Fetch Conversation History (remains the same)
// ----------------------------------------------------------------------
export async function fetchConversationHistory(userId) {
  try {
    // This correctly hits: API_BASE_URL + /history (e.g., /Backend/api/history)
    const response = await api.get('/history', { params: { userId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// Load Conversation (remains the same)
// ----------------------------------------------------------------------
export async function loadConversation(conversationId) {
  try {
    // This correctly hits: API_BASE_URL + /conversation (e.g., /Backend/api/conversation)
    const response = await api.get('/conversation', { params: { id: conversationId } });
    return response.data;
  } catch (error) {
    console.error('Error loading conversation:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// Send Chat Message (CRITICAL FIX APPLIED)
// ----------------------------------------------------------------------
/**
 * Send a chat message
 * @param {string} message - The message text
 * @param {string|null} conversationId - Optional conversation ID
 * @param {string} token - Clerk JWT token (passed from Chat.vue)
 * @returns {Promise<Object>} The updated conversation object
 */
export async function sendChatMessage(message, conversationId, token) {
    try {
      // 🔑 FIX: Switch to use the 'api' (axios) instance. 
      // Axios correctly prepends API_BASE_URL (/Backend/api) to the endpoint (/conversation).
      const response = await api.post('/conversation', {
        message,
        conversationId
      }, {
        // Since we are using the Clerk token, we manually set the Authorization header
        // to override any token set by the interceptor from localStorage.
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      // Axios automatically throws on 4xx/5xx responses and parses JSON
      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // If the server sends back a proper JSON error response (e.g., 400 or 500)
        console.error(`API Error ${error.response.status}:`, error.response.data);
        throw new Error(error.response.data.message || `API call failed with status ${error.response.status}`);
      }
      // Re-throw if it's a network error or client-side error
      console.error('API Error:', error);
      throw new Error(error.message || 'Network or client error during message send.');
    }
}