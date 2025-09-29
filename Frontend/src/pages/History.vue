<template>
    <div class="h-full w-full flex flex-col text-gray-800 p-4">
      
      <header class="flex-shrink-0">
        <h2 class="text-2xl font-semibold mb-4 pb-2 border-b border-gray-700">History</h2>
        <button
          @click="$emit('newChat')"
          class="w-full py-2 mb-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-md"
        >
          Start New Chat <span class="ml-1">➕</span>
        </button>
      </header>
  
      <ErrorDisplay 
        v-if="errorMessage"
        :message="errorMessage"
        @dismiss="errorMessage = null"
        class="flex-shrink-0"
      />
  
      <ul class="flex-grow space-y-2 overflow-y-auto custom-scrollbar">
        <li v-if="conversations.length === 0" class="text-gray-800 text-sm italic px-2">
          {{ isLoadingHistory ? 'Loading...' : 'No conversations yet.' }}
        </li>
        
        <li
          v-for="conv in conversations"
          :key="conv.id"
          @click="$emit('selectConversation', conv.id)"
          :class="{
            'bg-blue-600 text-white ': conv.id === currentConversationId,
            'text-gray-800 hover:bg-gray-200': conv.id !== currentConversationId
          }"
          class="p-3 cursor-pointer rounded-lg transition duration-100 truncate"
        >
          {{ conv.title || 'Untitled Chat' }}
        </li>
      </ul>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { fetchConversationHistory } from '../functions/chat-api.js';
  import ErrorDisplay from '../components/ErrorDisplay.vue';
  
  const conversations = ref([]);
  const isLoadingHistory = ref(false);
  const errorMessage = ref(null);
  
  defineProps({
    currentConversationId: {
      type: String,
      default: null,
    },
  });
  
  defineEmits(['newChat', 'selectConversation']);
  
  async function fetchHistory() {
    isLoadingHistory.value = true;
    errorMessage.value = null;
    try {
      conversations.value = await fetchConversationHistory();
    } catch (error) {
      console.error("Failed to fetch conversation history:", error);
      errorMessage.value = error.message;
    } finally {
      isLoadingHistory.value = false;
    }
  }
  
  onMounted(() => {
    fetchHistory();
  });
  </script>
  
  <style scoped>
  .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: #94a3b8; /* slate-400 */
      border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
      background-color: transparent;
  }
  </style>