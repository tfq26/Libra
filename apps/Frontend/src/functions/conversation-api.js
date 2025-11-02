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
  const text = (rawResponse ?? '').toString().trim();

  const endMatch = text.match(/\[END\s+(Y|N)\]$/i);
  if (endMatch) {
    const clean = text.replace(/\[END\s+(Y|N)\]$/i, '').trim();
    return { cleanMessage: clean, options: [], isDone: true };
  }

  let tag = null;
  if (/^\s*\[TYPE\]/i.test(text)) tag = 'TYPE';
  else if (/^\s*\[YN\]/i.test(text)) tag = 'YN';
  else if (/^\s*\[MC\]/i.test(text)) tag = 'MC';

  let cleaned = text.replace(/^\s*\[(MC|YN|TYPE)\]\s*/i, '').trim();
  const optionsRegex = /\[options:\s*([^\]]+)\]/i;
  let options = [];
  const m = cleaned.match(optionsRegex);
  if (m && m[1]) {
    try { options = JSON.parse(`[${m[1]}]`).map(String); } catch (_) { options = []; }
    cleaned = cleaned.replace(optionsRegex, '').trim();
  }

  const clampOptions = (arr, min, max, fallback) => {
    const list = Array.isArray(arr) ? arr.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()) : [];
    if (list.length < min) return fallback;
    return list.slice(0, max);
  };

  if (!tag) {
    if (/\b(yes|no)\b/i.test(cleaned) && cleaned.includes('?')) tag = 'YN';
    else if (/\b(choose|select|pick|option|options)\b/i.test(cleaned)) tag = 'MC';
    else tag = 'TYPE';
  }

  if (tag === 'TYPE') {
    options = [];
  } else if (tag === 'YN') {
    options = ['Yes', 'No'];
  } else if (tag === 'MC') {
    options = clampOptions(options, 2, 4, ['Continue', 'Something else']);
  }

  return { cleanMessage: cleaned, options, isDone: false };
}