// src/stores/conversationStore.js

import { defineStore } from 'pinia';
// 👇 It IMPORTS the function from your API file
import { loadConversation as apiLoadConversation } from '../functions/conversation-api';

export const useConversationStore = defineStore('conversation', {
  state: () => ({
    // Use a Map to store conversations, keyed by their ID.
    // Maps are generally more performant for this than plain objects.
    cachedConversations: new Map(),
  }),

  actions: {
    /**
     * This is the action your Vue component will call.
     * It handles the caching logic.
     */
    async getConversation(id, token, userId) {
      // 1. CHECK THE CACHE FIRST (Cache HIT)
      if (this.cachedConversations.has(id)) {
        console.log(`[Cache] HIT for conversation ${id}.`);
        return this.cachedConversations.get(id);
      }

      // 2. IF NOT IN CACHE, FETCH FROM API (Cache MISS)
      console.log(`[Cache] MISS for conversation ${id}. Fetching from network.`);
      
      // It calls your original API function here
      const conversationData = await apiLoadConversation(id, token, userId);

      // 3. SAVE THE NEWLY FETCHED DATA TO THE CACHE
      this.cachedConversations.set(id, conversationData);

      // 4. RETURN THE DATA
      return conversationData;
    },
    
    /**
     * Action to clear the cache when a conversation is updated.
     */
    invalidateConversation(id) {
        if (this.cachedConversations.has(id)) {
            console.log(`[Cache] INVALIDATING conversation ${id}.`);
            this.cachedConversations.delete(id);
        }
    }
  },
});