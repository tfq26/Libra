<template>
  <div class="p-6 mt-12 flex flex-col h-full rounded-xl shadow-inner">
    <!-- Header -->
    <header class="mb-8 flex-shrink-0">
      <div class="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-3">
        <h2 class="text-4xl font-semibold tracking-tight dark:text-sunset-200">
          Chat History
        </h2>
        <div class="flex items-center gap-2">
          <Button
            v-if="!isLoadingHistory"
            icon="pi pi-refresh"
            class="p-button-rounded p-button-text dark:text-white hover:scale-110 transition-transform"
            @click="fetchHistory"
            aria-label="Refresh History"
            v-tooltip.bottom="'Refresh'"
          />
          <Button
            v-if="conversations.length > 0 && !isLoadingHistory"
            icon="pi pi-trash"
            class="p-button-rounded p-button-danger p-button-text dark:text-white hover:scale-110 transition-transform"
            @click="confirmClearHistory"
            aria-label="Clear All History"
            v-tooltip.bottom="'Delete all chats'"
          />
        </div>
      </div>
    </header>

    <!-- Loading Spinner -->
    <div v-if="isLoadingHistory" class="flex-grow flex justify-center items-center py-16">
      <ProgressSpinner animationDuration=".8s" />
    </div>

    <!-- Error Message -->
    <Message v-else-if="errorMessage" severity="error" :closable="false" class="mx-auto max-w-md text-center">
      {{ errorMessage }}
    </Message>

    <!-- Chat List -->
    <div v-else class="flex-grow flex flex-col min-h-0">
      <div class="flex-grow overflow-y-auto custom-scrollbar space-y-3 p-1 pr-2">
        <ul class="space-y-3">
          <!-- Empty State -->
          <li
            v-if="conversations.length === 0"
            class="py-20 text-center text-gray-500 dark:text-gray-400"
          >
            <div class="flex flex-col items-center space-y-4">
              <i class="pi pi-inbox text-5xl text-gray-400 dark:text-gray-500"></i>
              <p class="text-lg">No conversations yet.</p>
              <Button
                label="Start New Chat"
                icon="pi pi-plus"
                @click="startNewChat"
                class="p-button-primary p-button-sm"
              />
            </div>
          </li>

          <!-- Conversation Items -->
          <li
            v-for="conv in conversations"
            :key="conv.id"
          >
            <div class="flex items-center group">
              <div
                class="flex-1 block p-4 rounded-xl shadow-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 ease-in-out hover:translate-x-1 hover:shadow-md cursor-pointer"
                :class="[
                  conv.id === route.params.id
                    ? 'bg-primary text-primary-contrast shadow-lg'
                    : 'bg-white dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                ]"
                @click="navigateToChat(conv.id)"
              >
                <div class="flex justify-between items-center">
                  <h3 class="font-semibold truncate text-lg">
                    {{ conv.title || 'Untitled Chat' }}
                  </h3>
                  <span
                    class="text-sm flex-shrink-0 ml-4"
                    :class="[ conv.id === route.params.id ? 'text-primary-contrast/80' : 'text-gray-500 dark:text-gray-400' ]"
                  >
                    {{ formatDate(conv.updatedAt) }}
                  </span>
                </div>
              </div>
              <Button
                icon="pi pi-trash"
                class="ml-2 p-button-rounded p-button-danger p-button-text opacity-70 group-hover:opacity-100 transition-opacity"
                style="min-width:2.5rem;"
                @click="() => confirmDeleteChat(conv.id)"
                aria-label="Delete Chat"
                v-tooltip.left="'Delete this chat'"
              />
            </div>
          </li>
        </ul>
      </div>

      <!-- Paginator -->
      <div v-if="totalRecords > pageSize" class="flex-shrink-0 pt-6">
        <Paginator
          :rows="pageSize"
          :totalRecords="totalRecords"
          :first="first"
          @page="onPageChange"
          class="p-paginator-primary"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { fetchConversationHistory } from '../functions/history-api.js';
import { deleteConversation, clearAllConversations } from '../functions/conversation-api.js';

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

// For confirmation dialogs
const showConfirmDelete = ref(false);
const showConfirmClear = ref(false);
const chatToDelete = ref(null);
// Confirm and delete a single chat
function confirmDeleteChat(chatId) {
  chatToDelete.value = chatId;
  if (window.confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
    handleDeleteChat(chatId);
  }
}

async function handleDeleteChat(chatId) {
  try {
    await deleteConversation(authStore.userId, chatId);
    conversations.value = conversations.value.filter(c => c.id !== chatId);
    totalRecords.value = Math.max(0, totalRecords.value - 1);
    // If the deleted chat is currently open, clear persisted ID and broadcast
    if (route.params.id === chatId) {
      const key = `libra:currentConversation:${authStore.userId}`;
      localStorage.removeItem(key);
      // Broadcast to other tabs
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('libra:conversation');
          bc.postMessage({ userId: authStore.userId, conversationId: null });
          bc.close();
        }
      } catch (e) {}
      router.push('/chat');
    }
  } catch (e) {
    window.alert('Failed to delete chat. Please try again.');
  }
}

// Confirm and clear all chats
function confirmClearHistory() {
  if (window.confirm('Are you sure you want to delete ALL your chats? This cannot be undone.')) {
    handleClearHistory();
  }
}

function navigateToChat(chatId) {
  if (route.params.id === chatId) {
    // If already on this chat, force reload by pushing to a dummy route then back
    router.replace({ path: '/chat', query: { reload: Date.now() } }).then(() => {
      router.replace({ params: { id: chatId } });
    });
  } else {
    router.push({ params: { id: chatId } });
  }
}

async function handleClearHistory() {
  try {
    await clearAllConversations(authStore.userId);
    conversations.value = [];
    totalRecords.value = 0;
    router.push('/chat');
  } catch (e) {
    window.alert('Failed to clear history. Please try again.');
  }
}

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
  fetchHistory(event.page + 1);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  width: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #a1a1aa; /* gray-400/500 */
  border-radius: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}

:deep(.p-paginator) {
  background: transparent;
  padding-top: 1rem;
  justify-content: center;
}
:deep(.p-paginator .p-paginator-element) {
  min-width: 2.5rem;
  height: 2.5rem;
  color: #9ca3af;
  border-radius: 8px;
}
:deep(.p-paginator .p-paginator-element:not(.p-disabled):not(.p-highlight):hover) {
  background: #4b5563;
  color: #f9fafb;
}
:deep(.p-paginator.p-paginator-primary .p-paginator-page.p-highlight) {
  background: var(--primary-color);
  color: var(--primary-contrast-color);
}
</style>
