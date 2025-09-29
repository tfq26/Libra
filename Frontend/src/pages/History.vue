<template>
  <div class="h-full w-full flex flex-col text-gray-800 p-4">
    
    <!-- Header -->
    <header class="flex-shrink-0 mb-4 mt-10">
      <div class="flex items-center justify-between border-b border-gray-700 pb-2 mb-3">
        <h2 class="text-5xl font-semibold dark:text-sunset-200">Chat History</h2>
        <button
          @click="startNewChat"
          class="flex items-center px-4 py-2 bg-ochre-600 hover:bg-ochre-700 text-white font-medium rounded-lg shadow-md transition"
        >
          <span class="mr-2 justify-center">➕</span> Start New Chat
        </button>
      </div>
    </header>

    <!-- Error Display -->
    <ErrorDisplay 
      v-if="errorMessage"
      :message="errorMessage"
      @dismiss="errorMessage = null"
      class="flex-shrink-0 mb-2"
    />

    <!-- Conversation List -->
    <ul class="flex-grow divide-y divide-gray-200 overflow-y-auto custom-scrollbar">
      <li v-if="conversations.length === 0" class="text-gray-500 text-sm italic px-2 py-4 text-center">
        {{ isLoadingHistory ? 'Loading...' : 'No conversations yet.' }}
      </li>
      
      <li
        v-for="conv in conversations"
        :key="conv.id"
      >
        <router-link
          :to="`/chat/${conv.id}`"
          :class="[
            'block p-4 rounded-lg transition duration-150 mt-2 mr-2',
            conv.id === currentConversationId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-50 hover:bg-gray-100 dark:bg-ochre-800 dark:hover:bg-ochre-700 dark:text-sunset-200'
          ]"
        >
          <div class="flex justify-between items-center">
            <h3 class="font-semibold truncate">
              {{ conv.title || 'Untitled Chat' }}
            </h3>
            <span class="text-sm text-gray-500 dark:text-sunset-300">
              {{ formatDate(conv.createdAt) }}
            </span>
          </div>
        </router-link>
      </li>
    </ul>
  </div>
</template>
  
<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router'; // Import useRouter
import { fetchConversationHistory } from '../functions/chat-api.js';
import ErrorDisplay from '../components/ErrorDisplay.vue';

const conversations = ref([]);
const isLoadingHistory = ref(false);
const errorMessage = ref(null);
const router = useRouter(); // Initialize the router
const route = useRoute();
const currentConversationId = route.params.id || null;

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

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// This function now correctly navigates the user
function startNewChat() {
  router.push('/chat');
}

// The onMounted hook no longer navigates automatically
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