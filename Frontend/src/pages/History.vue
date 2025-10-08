<template>

  <div class="text-gray-800 p-4">
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

    <Error
      v-if="errorMessage"
      :message="errorMessage"
      @dismiss="errorMessage = null"
      class="flex-shrink-0 mb-2"
    />

    <ul class="flex-grow divide-y divide-gray-200 overflow-y-auto custom-scrollbar">
      <li v-if="conversations.length === 0" class="text-gray-500 text-sm italic px-2 py-4 text-center dark:text-sunset-300">
        No conversations yet. Start a new one!
      </li>

      <li
        v-for="conv in conversations"
        :key="conv.id"
      >
        <router-link
          :to="`/chat/${conv.id}`"
          :class="[
            'block p-4 rounded-lg transition duration-150 mt-2 mr-2',
            conv.id === route.params.id
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-50 hover:bg-gray-100 dark:bg-ochre-800 dark:hover:bg-ochre-700 dark:text-sunset-200'
          ]"
        >
          <div class="flex justify-between items-center">
            <h3 class="font-semibold truncate">
              {{ conv.title || 'Untitled Chat' }}
            </h3>
            <span :class="[
                'text-sm',
                conv.id === route.params.id ? 'text-blue-200' : 'text-gray-500 dark:text-sunset-300'
            ]">
              {{ formatDate(conv.createdAt) }}
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
import { useAuthStore } from '../stores/auth'; // 👈 Switched to Firebase auth store
import { fetchConversationHistory } from '../functions/conversation-api.js';
import Error from '../pages/Error.vue';

const authStore = useAuthStore(); // 👈 Instantiate Firebase auth store
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
    const token = await authStore.getToken();
    const userId = authStore.userId;
    // 💡 NOTE: Ensure your 'fetchConversationHistory' function accepts userId and token
    conversations.value = await fetchConversationHistory(userId, token); 
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
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function startNewChat() {
  router.push('/chat');
}

// Watch for changes in authentication state
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      // If user is logged in, fetch their history
      fetchHistory();
    } else {
      // If user logs out, clear the history list
      conversations.value = [];
    }
  },
  { immediate: true } // This runs the check as soon as the component loads
);
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