// src/functions/chat-api.js

// --- CONFIGURATION ---
const AZURE_FUNCTION_BASE_URL = 'http://localhost:7071/api';
const USER_ID = 'user-123-test'; // Hardcoded user ID for demonstration

/**
 * Fetches the list of conversation titles (id, title, createdAt) for a specific user.
 * @returns {Promise<Array<{id: string, title: string, createdAt: string}>>}
 */
async function fetchConversationHistory() {
    try {
        const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/history?userId=${USER_ID}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("API Error: Failed to fetch history:", error);
        throw new Error("Could not load conversation history list.");
    }
}

/**
 * Fetches the full message history for a specific conversation.
 * @param {string} conversationId - The ID of the conversation to load.
 * @returns {Promise<Object>} The conversation object containing messages and title.
 */
async function loadConversation(conversationId) {
    try {
        const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/chat?id=${conversationId}&userId=${USER_ID}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("API Error: Failed to load conversation:", error);
        throw new Error("Could not load conversation details.");
    }
}

/**
 * Sends a new chat message or continues an existing conversation.
 * @param {string} prompt - The user's message.
 * @param {string | null} conversationId - The ID of the current conversation, or null for a new one.
 * @returns {Promise<{response: string, conversationId: string}>} The AI response and the (potentially new) conversation ID.
 */
async function sendChatMessage(prompt, conversationId) {
    try {
        const payload = {
            prompt: prompt,
            conversationId: conversationId,
            userId: USER_ID
        };

        const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
             throw new Error(`API call failed with status ${response.status}: ${errorBody.message || 'Server error'}`);
        }

        return await response.json();
    } catch (error) {
        console.error("API Error: Failed to send message:", error);
        throw new Error("Failed to get response from AI model.");
    }
}

export { fetchConversationHistory, loadConversation, sendChatMessage };