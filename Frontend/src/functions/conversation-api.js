import api from './api'; // 👈 Import the shared api client

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