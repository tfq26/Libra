<template>
  <div class="p-4">
    <header class="mb-4 mt-10">
      <div class="flex items-center justify-between border-b border-gray-700 pb-2 mb-3">
        <h2 class="text-5xl font-semibold dark:text-sunset-200">Chat History</h2>
        <Button 
          v-if="!isLoadingHistory"
          icon="pi pi-refresh" 
          class="p-button-rounded p-button-text dark:text-white"
          @click="fetchHistory" 
          aria-label="Refresh History"
          v-tooltip.bottom="'Refresh'"
        />
      </div>
    </header>

    <!-- Loading Spinner -->
    <div v-if="isLoadingHistory" class="flex justify-center items-center py-10">
      <ProgressSpinner />
    </div>

    <!-- Error Message -->
    <Message v-else-if="errorMessage" severity="error">
      {{ errorMessage }}
    </Message>
    
    <!-- Conversation List -->
    <ul v-else class="flex-grow divide-y divide-gray-700 overflow-y-auto custom-scrollbar">
      <li v-if="conversations.length === 0" class="text-gray-500 text-sm italic px-2 py-4 text-center dark:text-gray-400 flex flex-col items-center space-y-4">
        <p>No conversations yet. Start a new one!</p>
        <Button
          label="Start New Chat"
          icon="pi pi-plus"
          @click="startNewChat"
          class="p-button-primary"
        />
      </li>
      
      <li
        v-for="conv in conversations"
        :key="conv.id"
        class="transition-transform duration-200 hover:scale-[1.02]"
      >
        <router-link
          :to="`/chat/${conv.id}`"
          class="block p-4 rounded-lg transition duration-150 mt-2 mr-2"
          :class="[
            conv.id === route.params.id
              ? 'bg-primary text-primary-contrast shadow-lg'
              : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200'
          ]"
        >
          <div class="flex justify-between items-center">
            <h3 class="font-semibold truncate">
              {{ conv.title || 'Untitled Chat' }}
            </h3>
            <span 
              class="text-sm flex-shrink-0 ml-4"
              :class="[ conv.id === route.params.id ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400' ]"
            >
              {{ formatDate(conv.updatedAt) }}
            </span>
          </div>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
// 👇 1. CORRECTED THE IMPORT PATH
import { fetchConversationHistory } from '../functions/history-api.js';

// PrimeVue components
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import Tooltip from 'primevue/tooltip';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const conversations = ref([]);
const isLoadingHistory = ref(false);
const errorMessage = ref(null);

async function fetchHistory() {
  if (!authStore.isAuthenticated) return;

  isLoadingHistory.value = true;
  errorMessage.value = null;
  try {
    // 👇 2. SIMPLIFIED THE FUNCTION CALL
    // The token is now handled automatically by the api.js interceptor.
    conversations.value = await fetchConversationHistory(authStore.userId); 
  } catch (error) {
    console.error("Failed to fetch conversation history:", error);
    errorMessage.value = "Failed to load history. Please try again.";
  } finally {
    isLoadingHistory.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric'
  });
}

function startNewChat() {
  router.push('/chat');
}

// Watch for changes in authentication state
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated && !authStore.loading) {
      fetchHistory();
    } else {
      conversations.value = [];
    }
  },
  { immediate: true }
);

// Directive for tooltip
const vTooltip = Tooltip;
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