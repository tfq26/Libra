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
// NOTE: Assuming your custom useAuth is correctly imported from '@/utils/auth'
import { useAuth } from '@/utils/auth'; 
import { sendChatMessage, loadConversation } from '../functions/conversation-api';
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

async function loadChatHistory(id) {
  if (!isSignedIn.value) return;
  
  isLoadingChat.value = true;
  errorMessage.value = null;
  
  try {
    const token = await getToken().value;
    // 🔑 FIX 1: Check if token is null (failed retrieval) and throw a standard Error object.
    if (!token) throw new Error('Authentication token could not be retrieved.');
    
    const conversation = await loadConversation(id, token);
    messages.value = conversation.messages || [];
    chatTitle.value = conversation.title;
    currentConversationId.value = conversation.id;
    
    const lastMessage = messages.value[messages.value.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.options) {
      actionOptions.value = lastMessage.options;
      inputMode.value = 'buttons';
    }
  } catch (error) {
    console.error('Error loading chat:', error);
    // 🔑 FIX 2: Ensure we log/display a standard message and not the error object directly.
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
  if (!isSignedIn.value) return;
  const message = currentPrompt.value.trim();
  if (!message) return;
  
  currentPrompt.value = '';
  await sendMessage(message);
}

async function sendMessage(promptText) {
  if (!isSignedIn.value || isLoadingChat.value) return;
  
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
    userId: userId
  });
  
  await scrollToBottom();
  
  try {
    const token = await getToken().value;
    if (!token) {
      throw new Error('Authentication required. Please sign in again.');
    }
    
    const data = await sendChatMessage(
      promptText, 
      currentConversationId.value, 
      token,
      userId.value
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
    
    // If it's an auth error, you might want to redirect to login
    if (error.message.includes('auth') || error.message.includes('token')) {
      router.push({ name: 'sign-in', query: { redirect: route.fullPath } });
    }
  } finally {
    isLoadingChat.value = false;
    scrollToBottom();
  }
}

// Lifecycle
onMounted(() => {
  if (isSignedIn.value && route.params.id) {
    loadChatHistory(route.params.id);
  }
});

// Watch for route changes
watch(
  () => route.params.id,
  (newId) => {
    if (newId && isSignedIn.value) {
      loadChatHistory(newId);
    } else {
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

// Watch auth state
watch([isLoaded, isSignedIn], ([loaded, signedIn]) => {
  if (loaded && signedIn && route.params.id) {
    loadChatHistory(route.params.id);
  }
});
</script>