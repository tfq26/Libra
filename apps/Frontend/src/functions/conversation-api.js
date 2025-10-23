/**
 * Deletes a single conversation for the user.
 * Calls DELETE /conversation?userId=...&id=...
 * @param {string} userId
 * @param {string} conversationId
 */
export async function deleteConversation(userId, conversationId) {
  try {
    const response = await api.delete('/conversation', {
      params: { userId, id: conversationId }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Deletes all conversations for the user.
 * Calls DELETE /conversation?userId=...&all=true
 * @param {string} userId
 */
export async function clearAllConversations(userId) {
  try {
    const response = await api.delete('/conversation', {
      params: { userId, all: true }
    });
    return response.data;
  } catch (error) {
    console.error('Error clearing all conversations:', error);
    throw error;
  }
}
import api from './api'; // 👈 Import the shared api client
import axios from 'axios';

/**
 * Loads the full message history for a single conversation.
 * @param {string} conversationId 
 * @param {string} token 
 * @param {string} userId
 */
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

/**
 * Sends a new message to the conversation.
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

/**
 * Create a draft conversation for the authenticated user.
 * @param {string} token - Firebase ID token
 */
export async function initConversation(token) {
  try {
    const response = await api.post('/init-conversation', {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error initializing conversation:', error);
    throw error;
  }
}

/**
 * Saves the current state of a conversation when the user leaves the page.
 * @param {string} conversationId
 * @param {Array} messages
 * @param {string} title
 * @param {string} token
 * @param {string} userId
 */
export async function saveConversation(conversationId, messages, title, token, userId) {
  try {
    const response = await api.put('/conversation', {
      conversationId,
      messages,
      title,
      userId
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Conversation saved successfully.');
    return response.data;
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

// src/functions/ai-parser.js

/**
 * Parses the raw streaming response from the AI to extract a clean message,
 * button options, and the "done" state.
 * @param {string} rawResponse The full accumulated response text.
 * @returns {{cleanMessage: string, options: string[], isDone: boolean}}
 */
export function parseAIResponse(rawResponse) {
  const response = rawResponse.trim();

  // Check for end tags first
  if (response.endsWith('[END Y]')) {
    return {
      cleanMessage: response.replace('[END Y]', '').trim(),
      options: [],
      isDone: true,
    };
  }
  if (response.endsWith('[END N]')) {
    return {
      cleanMessage: response.replace('[END N]', '').trim(),
      options: [],
      isDone: true,
    };
  }

  // Check for a typed-input request
  if (response.startsWith('[TYPE]')) {
    return {
      cleanMessage: response.replace('[TYPE]', '').trim(),
      options: [], // Empty array signals to show text input
      isDone: false,
    };
  }
  
  // Remove other prefixes for parsing
  const cleanForParsing = response.replace(/\[MC\]|\[YN\]/g, '').trim();
  const regex = /\[options:\s*([^\]]+)\]/;
  const match = cleanForParsing.match(regex);

  if (match && match[1]) {
    const cleanMessage = cleanForParsing.replace(regex, '').trim();
    try {
      const optionsArray = JSON.parse(`[${match[1]}]`);
      return { cleanMessage, options: optionsArray, isDone: false };
    } catch (e) {
      // Fallback for malformed options
      return { cleanMessage, options: [], isDone: false };
    }
  }

  // If no tags are found yet, just return the cleaned text.
  return {
    cleanMessage: cleanForParsing,
    options: [],
    isDone: false,
  };
}