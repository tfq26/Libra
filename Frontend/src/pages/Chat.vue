<template>
  <div v-if="!isLoaded" class="flex items-center justify-center h-full">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-sunset-400"></div>
  </div>

  <div v-else-if="!isSignedIn" class="flex items-center justify-center h-full text-center p-8">
    <Error :message="'Please sign in to access this chat'" code="402" />
  </div>

  <div v-else class="flex font-sans overflow-hidden h-full">
    <main class="flex-grow flex flex-col p-2 shadow-xl">

      <header class="mb-2 flex items-start flex-shrink-0 dark:text-sunset-300 justify-start">
        <div class="border-b border-gray-700 w-full pb-2">
          <h1 class="text-5xl font-bold text-gray-800 dark:text-sunset-200 truncate text-start">{{ chatTitle || 'New Chat' }}</h1>
        </div>
      </header>

      <MessageList
        ref="messageListComp"
        :messages="filteredMessages"
        :is-loading="isLoadingChat"
        class="flex-1 overflow-y-auto"
      />

      <Error
        v-if="errorMessage"
        :message="errorMessage"
        @dismiss="errorMessage = null"
      />

      <div class="mt-2 flex-shrink-0">
        <div v-if="inputMode === 'buttons' && actionOptions && actionOptions.length > 0 && !isLoadingChat" class="flex items-end space-x-2">
          <ActionButtons class="flex-grow" :options="actionOptions" @response="handleButtonResponse" />

          <button @click="inputMode = 'text'" class="p-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition" title="Type a custom message">
            ...
          </button>
        </div>

        <MessageInput
          v-else
          v-model="currentPrompt"
          :is-loading="isLoadingChat"
          :placeholder="isChatting ? 'Type your message...' : 'Describe your issue to begin.'"
          @send="handleTextInputSend"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/utils/auth'; 
import { sendChatMessage, loadConversation } from '../functions/conversation-api'; // Removed loadChatHistory import
import MessageList from '../components/chat/MessageList.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import Error from './Error.vue';
import { nextTick } from 'vue';

// Auth
const { isLoaded, isSignedIn, userId, user, getToken } = useAuth();

// Chat state
const messages = ref([]);
const currentPrompt = ref('');
const chatTitle = ref('');
const chatSubtitle = ref('');
const messageListComp = ref(null);
const errorMessage = ref(null);
const isLoadingChat = ref(false);
const inputMode = ref('text');
const actionOptions = ref([]);
const currentConversationId = ref(null);

const route = useRoute();
const router = useRouter();

// Computed
const isChatting = computed(() => messages.value.length > 0);
const filteredMessages = computed(() => 
  messages.value.filter(msg => msg.role !== 'system')
);

// Methods
async function scrollToBottom() {
  await nextTick();
  const container = messageListComp.value?.$el;
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// 🔑 FIXED: loadChatHistory defined in the component scope
async function loadChatHistory(id) {
  // 1. CRITICAL INITIAL GUARD (Fixes TypeError: W is not a constructor)
  if (!isSignedIn.value || !userId.value || typeof getToken.value !== 'function') {
    return;
  }
  
  isLoadingChat.value = true;
  errorMessage.value = null;
  
  try {
    // 2. TOKEN RETRIEVAL: Correctly call the function via .value
    const token = await getToken.value(); 

    if (!token) {
      throw new Error('Authentication token could not be retrieved. Please sign in again.');
    }
    
    // 3. API CALL: Pass token and userId.value (for Partition Key/Authorization)
    const conversation = await loadConversation(id, token, userId.value); 
    
    // 4. State Update
    messages.value = conversation.messages || [];
    chatTitle.value = conversation.title;
    currentConversationId.value = conversation.id;
    
    const lastMessage = messages.value[messages.value.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.options) {
      actionOptions.value = lastMessage.options;
      inputMode.value = 'buttons';
    } else {
      inputMode.value = 'text';
    }
    
  } catch (error) {
    console.error('Error loading chat:', error);
    errorMessage.value = error.message || 'Failed to load chat history.';
  } finally {
    isLoadingChat.value = false;
  }
}

async function handleButtonResponse(responseText) {
  if (!isSignedIn.value) return;
  messages.value.push({ role: 'user', content: responseText });
  await scrollToBottom();
  await sendMessage(responseText);
}

async function handleTextInputSend() {
  if (!isSignedIn.value) return; // Check 1: User signed in?
  
  const message = currentPrompt.value.trim();
  if (!message) return;
  
  // 🔑 FIX: Add an explicit check for the userId here as well, 
  // preventing the call to sendMessage if the core ID is missing.
  if (!userId.value) { 
      console.warn("Cannot send message: User ID is unavailable.");
      return;
  }
  
  currentPrompt.value = '';
  await sendMessage(message);
}

async function sendMessage(promptText) {
  if (!isSignedIn.value || isLoadingChat.value) return;
  
  // CRITICAL GUARD: Ensure userId is available before proceeding
  if (!userId.value || typeof getToken.value !== 'function') {
    console.warn("Auth state not fully loaded for sendMessage.");
    return;
  }

  isLoadingChat.value = true;
  errorMessage.value = null;
  
  // Add user message to chat
  if (messages.value.length === 0) {
    chatTitle.value = promptText.substring(0, 30);
    chatSubtitle.value = '';
  }
  
  messages.value.push({ 
    role: 'user', 
    content: promptText,
    timestamp: new Date().toISOString(),
    userId: userId.value // Use .value consistently
  });
  
  await scrollToBottom();
  
  try {
    // 🔑 FIX: Correctly call getToken.value()
    const token = await getToken.value();
    
    if (!token) {
      throw new Error('Authentication required. Please sign in again.');
    }
    
    const data = await sendChatMessage(
      promptText, 
      currentConversationId.value, 
      token,
      userId.value // 🔑 FIX: Correctly pass the string value
    );
    
    // Add assistant response
    messages.value.push({ 
      role: 'assistant', 
      content: data.response,
      timestamp: new Date().toISOString(),
      userId: userId.value
    });
    
    // Handle action buttons if present
    actionOptions.value = data.options || [];
    inputMode.value = actionOptions.value.length > 0 ? 'buttons' : 'text';
    
    // Handle conversation completion
    if (data.isDone) {
      inputMode.value = 'text';
      actionOptions.value = [];
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    }
    
    // Update conversation ID if this is a new conversation
    if (!currentConversationId.value && data.conversationId) {
      currentConversationId.value = data.conversationId;
      // Update URL to reflect the new conversation ID
      router.replace({ 
        params: { id: data.conversationId } 
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    errorMessage.value = error.message || 'Failed to send message.';
    
    if (error.message.includes('auth') || error.message.includes('token')) {
      router.push({ name: 'SignIn', query: { redirect: route.fullPath } });
    }
  } finally {
    isLoadingChat.value = false;
    scrollToBottom();
  }
}

// Watch for route changes (must be here)
watch(
  () => route.params.id,
  (newId) => {
    // If the new ID is present AND auth is ready, load history
    if (newId && isSignedIn.value && userId.value) {
      loadChatHistory(newId);
    } else if (!newId) {
      // Reset for new chat
      messages.value = [];
      chatTitle.value = '';
      currentConversationId.value = null;
      inputMode.value = 'text';
      actionOptions.value = [];
    }
  },
  { immediate: true }
);

// Watch auth state (Stabilized trigger for initial load)
watch([isLoaded, isSignedIn, userId], ([loaded, signedIn, currentUserId]) => {
  // Only trigger loadChatHistory if ALL dependencies are ready and we have an ID
  if (loaded && signedIn && currentUserId && route.params.id) {
    loadChatHistory(route.params.id);
  }
});

// NOTE: onMounted is now redundant since the watchers handle the initial load
</script>