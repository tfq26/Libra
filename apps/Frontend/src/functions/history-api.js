import api from './api';

/**
 * Fetches a paginated list of conversation history for a given user.
 * @param {string} userId - The ID of the user.
 * @param {number} page - The page number to fetch.
 * @param {number} pageSize - The number of items per page.
 * @returns {Promise<{conversations: Array, total: number}>} A promise that resolves to an object with the conversations and total count.
 */
export async function fetchConversationHistory(userId, page = 1, pageSize = 10) {
  if (!userId) {
    throw new Error('User ID is required to fetch conversation history.');
  }

  try {
    const response = await api.get('/history', { 
      params: { 
        userId,
        page,
        pageSize
      } 
    });
    return response.data; // This will be { conversations, total }
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
}

/**
 * Saves the current state of a conversation.
 * @param {string} conversationId
 * @param {Array} messages
 * @param {string} title
 * @param {string} userId
 */
export async function saveConversation(conversationId, messages, title, userId) {
    if (!conversationId || !messages || !title || !userId) {
        throw new Error('Missing required fields for saving conversation.');
    }
    try {
        const response = await api.put('/history', { conversationId, messages, title, userId });
        console.log('Conversation saved successfully.');
        return response.data;
    } catch (error) {
        console.error('Error saving conversation:', error);
        throw error;
    }
}

/**
 * Deletes a conversation.
 * @param {string} conversationId
 * @param {string} userId
 */
export async function deleteConversation(conversationId, userId) {
    if (!conversationId || !userId) {
        throw new Error('Conversation ID and User ID are required for deletion.');
    }
    try {
        const response = await api.delete('/history', { data: { conversationId, userId } });
        console.log('Conversation deleted successfully.');
        return response.data;
    } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
}

