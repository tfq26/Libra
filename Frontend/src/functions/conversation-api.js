import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create an axios instance with default config (No changes needed here)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token (No changes needed here)
api.interceptors.request.use(
  (config) => {
    // Note: Using the authStore's getToken method is often safer than localStorage directly
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

// --- Fetch Conversation History (No changes) ---
export async function fetchConversationHistory(userId) {
  try {
    const response = await api.get('/history', { params: { userId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
}

// --- Load Conversation (GET) (No changes) ---
export async function loadConversation(conversationId, token, userId) { 
  try {
    const response = await api.get('/conversation', { 
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

// --- Send Chat Message (POST) (No changes) ---
export async function sendChatMessage(message, conversationId, token, userId) {
  try {
    const response = await api.post('/conversation', {
      message,
      conversationId,
      userId
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

// --- 👇 ADD THIS NEW FUNCTION 👇 ---
// ----------------------------------------------------------------------
// Save Conversation State (PUT)
// ----------------------------------------------------------------------
/**
 * Saves the current state of a conversation to the database.
 * @param {string} conversationId
 * @param {Array} messages - The full array of message objects.
 * @param {string} title - The current chat title.
 * @param {string} userId
 */
export async function saveConversation(conversationId, messages, title, userId) {
  try {
    // This function makes a PUT request to your new backend endpoint
    const response = await api.put('/conversation', {
      conversationId,
      messages,
      title,
      userId
    });
    console.log('Conversation saved successfully.');
    return response.data;
  } catch (error) {
    // We don't throw an error here because this is a background task.
    // Failing to save shouldn't block the user from navigating away.
    console.error('Error saving conversation:', error);
  }
}