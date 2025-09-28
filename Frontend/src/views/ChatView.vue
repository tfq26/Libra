<template>
  <div class="flex flex-col flex-grow bg-platinum-100 dark:bg-eerie_black-900 transition-colors duration-500">
    <div class="flex flex-1 rounded-none overflow-hidden">
      <!-- Sidebar -->
      <div class="w-64 bg-platinum-500 dark:bg-jet-500 border-r border-platinum-400 dark:border-jet-400 flex flex-col transition-colors duration-500">
        <div class="p-4 border-b border-platinum-400 dark:border-jet-400">
          <button
            @click="startNewChat"
            class="w-full bg-saffron-500 hover:bg-saffron-600 text-eerie_black-500 font-bold py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center transform hover:scale-105 shadow-md"
          >
            <span class="text-xl mr-2 font-light">+</span> New Chat
          </button>
        </div>
        
        <!-- Conversations -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div v-if="chatStore.isLoading && !chatStore.conversations.length" class="p-4 text-center text-eerie_black-500 dark:text-platinum-500">
            <div class="flex items-center justify-center space-x-2">
              <div class="w-3 h-3 rounded-full bg-saffron-500 animate-pulse" style="animation-delay: 0s"></div>
              <div class="w-3 h-3 rounded-full bg-saffron-500 animate-pulse" style="animation-delay: 0.2s"></div>
              <div class="w-3 h-3 rounded-full bg-saffron-500 animate-pulse" style="animation-delay: 0.4s"></div>
            </div>
            <span class="mt-2 text-sm block">Loading...</span>
          </div>
          
          <div v-else-if="!chatStore.conversations.length" class="p-4 text-center text-eerie_black-400 dark:text-platinum-400">
            No conversations yet.
          </div>
          
          <div v-else>
            <div 
              v-for="conversation in chatStore.conversations" 
              :key="conversation.id"
              @click="loadConversation(conversation.id)"
              class="p-3 cursor-pointer border-b border-platinum-400 dark:border-jet-400 transition-all duration-300"
              :class="{ 
                'bg-saffron-500/10 dark:bg-saffron-500/10': chatStore.currentConversation === conversation.id,
                'hover:bg-saffron-500/5 dark:hover:bg-saffron-500/5': chatStore.currentConversation !== conversation.id
              }"
            >
              <div class="font-medium text-eerie_black-500 dark:text-platinum-500 truncate">
                {{ conversation.title || 'New Chat' }}
              </div>
              <div class="text-xs text-eerie_black-400 dark:text-platinum-400 truncate">
                {{ formatDate(conversation.lastUpdated) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Messages -->
<div class="flex-1 flex flex-col">
  <!-- Scrollable messages -->
  <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
    <div v-if="chatStore.messages.length === 0" class="h-full flex items-center justify-center">
      <div class="text-center p-8 max-w-md mx-auto">
        <h2 class="text-3xl font-bold text-eerie_black-500 dark:text-platinum-500 mb-2">Welcome to Libra Chat</h2>
        <p class="text-eerie_black-400 dark:text-platinum-400 mb-6">
          Start a new conversation or select an existing one from the sidebar.
        </p>
        <button
          @click="startNewChat"
          class="bg-saffron-500 hover:bg-saffron-600 text-eerie_black-500 font-bold py-2.5 px-8 rounded-full transition-colors duration-300 shadow-md transform hover:scale-105"
        >
          New Chat
        </button>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div 
        v-for="(message, index) in chatStore.messages" 
        :key="index"
        class="flex animate-in fade-in slide-in-from-bottom-2 duration-300"
        :class="{
          'justify-end': message.role === 'user',
          'justify-start': message.role !== 'user'
        }"
      >
        <div 
          class="max-w-3xl rounded-3xl px-5 py-4 shadow-lg transition-all duration-300"
          :class="{
            'bg-saffron-500 text-eerie_black-500': message.role === 'user',
            'bg-platinum-500 dark:bg-jet-500 border border-platinum-400 dark:border-jet-400 text-eerie_black-500 dark:text-platinum-500': message.role !== 'user'
          }"
        >
          <div 
            class="prose dark:prose-invert max-w-none text-sm leading-relaxed"
            v-html="formatMessage(message.content)"
          ></div>
          <div 
            class="text-xs mt-2"
            :class="{
              'text-eerie_black-400': message.role === 'user',
              'text-eerie_black-400 dark:text-platinum-400': message.role !== 'user'
            }"
          >
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
      </div>

      <!-- Loading dots -->
      <div v-if="chatStore.isLoading" class="flex justify-start">
        <div class="bg-platinum-500 dark:bg-jet-500 border border-platinum-400 dark:border-jet-400 rounded-3xl px-5 py-4 max-w-3xl shadow-lg">
          <div class="flex space-x-2">
            <div class="w-3 h-3 rounded-full bg-saffron-500 animate-pulse" style="animation-delay: 0s"></div>
            <div class="w-3 h-3 rounded-full bg-saffron-500 animate-pulse" style="animation-delay: 0.2s"></div>
            <div class="w-3 h-3 rounded-full bg-saffron-500 animate-pulse" style="animation-delay: 0.4s"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Input bar fixed at bottom -->
  <div class="sticky bottom-0 border-t border-platinum-400 dark:border-jet-400 p-6 bg-platinum-500 dark:bg-jet-500">
    <form @submit.prevent="sendMessage" class="flex space-x-4">
      <input
        v-model="newMessage"
        type="text"
        placeholder="Type your message..."
        class="flex-1 rounded-full border border-platinum-400 dark:border-jet-400 bg-platinum-600 dark:bg-jet-600 text-eerie_black-500 dark:text-platinum-500 px-6 py-3 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 transition-colors duration-300"
        :disabled="chatStore.isLoading"
      />
      <button
        type="submit"
        class="bg-saffron-500 hover:bg-saffron-600 text-eerie_black-500 font-bold py-3 px-8 rounded-full transition-colors duration-300 shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!newMessage.trim() || chatStore.isLoading"
      >
        Send
      </button>
    </form>
    <p v-if="chatStore.error" class="text-saffron-500 text-sm mt-2 font-medium">{{ chatStore.error }}</p>
  </div>
</div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const newMessage = ref('');

const formatMessage = (content) => {
  if (!content) return '';
  return content
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-saffron-700 hover:underline" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || chatStore.isLoading) return;
  
  const message = newMessage.value;
  newMessage.value = '';
  
  try {
    await chatStore.sendMessage(message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

const startNewChat = () => {
  chatStore.startNewConversation();
  router.push('/chat');
};

const loadConversation = async (conversationId) => {
  if (chatStore.currentConversation === conversationId) return;
  
  try {
    await chatStore.fetchConversation(conversationId);
    router.push(`/chat/${conversationId}`);
  } catch (error) {
    console.error('Error loading conversation:', error);
  }
};

onMounted(async () => {
  try {
    await chatStore.fetchConversations();
    
    if (route.params.id) {
      await chatStore.fetchConversation(route.params.id);
    } else if (chatStore.conversations.length > 0) {
      router.push(`/chat/${chatStore.conversations[0].id}`);
    }
  } catch (error) {
    console.error('Error initializing chat:', error);
  }
});
</script>

<style scoped>
/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #a0b7ab;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6f9281;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>