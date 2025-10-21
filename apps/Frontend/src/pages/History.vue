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

    <div v-if="isLoadingHistory" class="flex justify-center items-center py-10">
      <ProgressSpinner />
    </div>

    <Message v-else-if="errorMessage" severity="error">
      {{ errorMessage }}
    </Message>
    
    <div v-else>
      <ul class="flex-grow divide-y divide-gray-700 overflow-y-auto custom-scrollbar min-h-[60vh]">
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

      <!-- Paginator Component -->
      <Paginator
        v-if="totalRecords > pageSize"
        :rows="pageSize"
        :totalRecords="totalRecords"
        :first="first"
        @page="onPageChange"
        class="mt-4 p-paginator-primary"
      ></Paginator>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { fetchConversationHistory } from '../functions/history-api.js';

import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import Paginator from 'primevue/paginator';
import Tooltip from 'primevue/tooltip';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const conversations = ref([]);
const isLoadingHistory = ref(false);
const errorMessage = ref(null);

const currentPage = ref(1);
const pageSize = ref(10);
const totalRecords = ref(0);

// This computed property tells the paginator which record to start on
const first = computed(() => (currentPage.value - 1) * pageSize.value);

async function fetchHistory(page = 1) {
  if (!authStore.isAuthenticated) return;

  isLoadingHistory.value = true;
  errorMessage.value = null;
  currentPage.value = page;

  try {
    const response = await fetchConversationHistory(authStore.userId, currentPage.value, pageSize.value);
    conversations.value = response.conversations;
    totalRecords.value = response.total;
  } catch (error) {
    console.error("Failed to fetch conversation history:", error);
    errorMessage.value = "Failed to load history. Please try again.";
  } finally {
    isLoadingHistory.value = false;
  }
}

function onPageChange(event) {
  // event.page is 0-indexed, so we add 1
  fetchHistory(event.page + 1);
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

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated && !authStore.loading) {
      fetchHistory();
    } else {
      conversations.value = [];
      totalRecords.value = 0;
    }
  },
  { immediate: true }
);

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

