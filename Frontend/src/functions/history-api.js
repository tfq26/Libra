import api from './api'; // 👈 Import the shared api client

/**
 * Fetches the conversation history list for a given user.
 * @param {string} userId - The ID of the user whose history is being requested.
 */
export async function fetchConversationHistory(userId) {
  if (!userId) {
    throw new Error('User ID is required to fetch conversation history.');
  }
  try {
    const response = await api.get('/history', { 
      params: { 
        userId 
      } 
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
}

/**
 * Saves the current state of a conversation.
 * NOTE: The auth token is now handled automatically by the api.js interceptor.
 * @param {string} conversationId
 * @param {Array} messages
 * @param {string} title
 * @param {string} userId
 */
export async function saveConversation(conversationId, messages, title, userId) {
  try {
    const response = await api.put('/history', {
      conversationId,
      messages,
      title,
      userId
    });
    console.log('Conversation saved successfully.');
    return response.data;
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

/**
 * Deletes a conversation from the database.
 * @param {string} conversationId - The ID of the conversation to delete.
 * @param {string} userId - The ID of the user for authorization.
 */
export async function deleteConversation(conversationId, userId) {
  try {
    // Correctly pass data in the 'data' property for a DELETE request body
    const response = await api.delete('/history', {
      data: { 
        conversationId,
        userId 
      }
    });
    console.log('Conversation deleted successfully.');
    return response.data;
  } catch (error) {
    console.error('Error deleting conversation:', error);
  }
}

