<template>
    <div class="flex flex-col bg-gray-100 flex font-sans overflow-hidden">
      <main class="flex-grow flex flex-col p-2 md:p-6 bg-white shadow-xl"> 
        
        <header class="mb-4 flex items-center flex-shrink-0">
          <div>
            <h1 class="text-3xl font-bold text-gray-800 truncate">{{ chatTitle }}</h1>
            <p v-if="chatSubtitle" class="text-gray-500 mt-1">{{ chatSubtitle }}</p>
          </div>
        </header>
        
        <MessageList
          ref="messageListComp"
          :messages="filteredMessages"
          :is-loading="isLoadingChat"
        />
  
        <ErrorDisplay 
          v-if="errorMessage"
          :message="errorMessage"
          @dismiss="errorMessage = null"
        />
  
        <MessageInput 
          v-model="currentPrompt"
          :is-loading="isLoadingChat"
          :placeholder="isChatting ? 'Type your message...' : 'Start a new conversation.'"
          @send="sendMessage"
        />
      </main>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, nextTick } from 'vue';
  import { loadConversation, sendChatMessage } from '../functions/chat-api.js';
  
  // Import the necessary components
  import MessageList from '../components/chat/MessageList.vue';
  import MessageInput from '../components/chat/MessageInput.vue';
  import ErrorDisplay from '../components/ErrorDisplay.vue';
  
  // --- Simplified state for a single chat session ---
  const messages = ref([]);
  const currentConversationId = ref(null);
  const currentPrompt = ref('');
  const isLoadingChat = ref(false);
  const chatTitle = ref('');
  const chatSubtitle = ref('');
  const messageListComp = ref(null);
  const errorMessage = ref(null);
  
  const isChatting = computed(() => messages.value.length > 0 || currentConversationId.value !== null);
  const filteredMessages = computed(() => messages.value.filter(msg => msg.role !== 'system'));
  
  async function scrollToBottom() {
    await nextTick();
    const container = messageListComp.value?.$el.querySelector('#messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  
  function startNewChat() {
    currentConversationId.value = null;
    messages.value = [];
    currentPrompt.value = '';
    errorMessage.value = null;
    chatTitle.value = "New Chat";
    chatSubtitle.value = "Start your technical support conversation with Libra.";
    nextTick(() => {
      const input = document.querySelector('input');
      if (input) input.focus();
    });
  }
  
  async function sendMessage() {
    const prompt = currentPrompt.value.trim();
    if (!prompt || isLoadingChat.value) return;
  
    errorMessage.value = null;
    isLoadingChat.value = true;
    
    if (currentConversationId.value === null) {
      chatTitle.value = prompt.substring(0, 30) + '...';
      chatSubtitle.value = '';
    }
  
    messages.value.push({ role: 'user', content: prompt });
    currentPrompt.value = ''; 
    scrollToBottom();
  
    try {
      const data = await sendChatMessage(prompt, currentConversationId.value);
      // Assuming the API now sends the full message object
      messages.value.push({ role: 'assistant', content: data.response });
      scrollToBottom();
      
      // Set the conversation ID if it's a new chat
      if (!currentConversationId.value) {
        currentConversationId.value = data.conversationId;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      errorMessage.value = error.message;
      messages.value.pop(); // Remove the optimistic user message on failure
    } finally {
      isLoadingChat.value = false;
    }
  }
  
  // Start a new chat as soon as the component is mounted
  onMounted(() => {
    startNewChat();
  });
  </script>