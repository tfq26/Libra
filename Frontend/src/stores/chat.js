import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore();
  
  // State
  const conversations = ref([]);
  const messages = ref([]);
  const currentConversation = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  // Getters
  const hasConversations = computed(() => conversations.value.length > 0);
  const currentMessages = computed(() => messages.value);
  const currentConversationId = computed(() => currentConversation.value);

  // Actions
  const fetchConversations = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/conversations', {
      //   headers: {
      //     'Authorization': `Bearer ${authStore.token}`
      //   }
      // });
      // const data = await response.json();
      
      // Mock data for now
      const mockConversations = [
        { id: '1', title: 'First Chat', lastUpdated: new Date().toISOString() },
        { id: '2', title: 'Second Chat', lastUpdated: new Date(Date.now() - 86400000).toISOString() },
      ];
      
      conversations.value = mockConversations;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      error.value = 'Failed to load conversations';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchConversation = async (conversationId) => {
    try {
      if (!conversationId) {
        startNewConversation();
        return;
      }
      
      isLoading.value = true;
      error.value = null;
      currentConversation.value = conversationId;
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/conversations/${conversationId}`, {
      //   headers: {
      //     'Authorization': `Bearer ${authStore.token}`
      //   }
      // });
      // const data = await response.json();
      
      // Mock data for now
      const mockMessages = [
        {
          id: '1',
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          timestamp: new Date().toISOString()
        }
      ];
      
      messages.value = mockMessages;
    } catch (err) {
      console.error('Error fetching conversation:', err);
      error.value = 'Failed to load conversation';
    } finally {
      isLoading.value = false;
    }
  };

  const sendMessage = async (content) => {
    if (!content.trim()) return;
    
    try {
      isLoading.value = true;
      error.value = null;
      
      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
      
      messages.value = [...messages.value, userMessage];
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/conversations/${currentConversation.value || ''}/messages`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${authStore.token}`
      //   },
      //   body: JSON.stringify({ content: content.trim() })
      // });
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add assistant response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received your message: "${content}"`,
        timestamp: new Date().toISOString()
      };
      
      messages.value = [...messages.value, assistantMessage];
      
      // If this is a new conversation, add it to the list
      if (!currentConversation.value) {
        const newConversation = {
          id: Date.now().toString(),
          title: content.length > 30 ? `${content.substring(0, 30)}...` : content,
          lastUpdated: new Date().toISOString()
        };
        conversations.value = [newConversation, ...conversations.value];
        currentConversation.value = newConversation.id;
      } else {
        // Update the last updated time for the current conversation
        const conversation = conversations.value.find(c => c.id === currentConversation.value);
        if (conversation) {
          conversation.lastUpdated = new Date().toISOString();
        }
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      error.value = 'Failed to send message';
    } finally {
      isLoading.value = false;
    }
  };

  const startNewConversation = () => {
    currentConversation.value = null;
    messages.value = [];
    error.value = null;
  };

  const deleteConversation = async (conversationId) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${authStore.token}`
      //   }
      // });
      
      conversations.value = conversations.value.filter(c => c.id !== conversationId);
      
      if (currentConversation.value === conversationId) {
        startNewConversation();
      }
      
    } catch (err) {
      console.error('Error deleting conversation:', err);
      error.value = 'Failed to delete conversation';
    }
  };

  // Initialize the store
  const init = async () => {
    await fetchConversations();
  };

  return {
    // State
    conversations,
    messages,
    currentConversation,
    isLoading,
    error,
    
    // Getters
    hasConversations,
    currentMessages,
    currentConversationId,
    
    // Actions
    fetchConversations,
    fetchConversation,
    sendMessage,
    startNewConversation,
    deleteConversation,
    init
  };
});
