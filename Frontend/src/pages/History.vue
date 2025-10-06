<template>
  <div v-if="clerkAuth.isLoaded.value && !clerkAuth.isSignedIn.value" class="flex items-center justify-center h-full text-center p-8">
    <div class="max-w-md">
      <h2 class="text-3xl font-bold text-lion-600 dark:text-lion-400 mb-4">History Access Restricted</h2>
      <p class="text-gray-700 dark:text-gray-300 mb-6">Please sign in to view your past conversations.</p>
      <router-link
        to="/sign-in"
        class="inline-block transform rounded-lg bg-lion-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-lion-700"
      >
        Go to Sign In
      </router-link>
    </div>
  </div>
  <div v-else-if="!clerkAuth.isLoaded.value || isLoadingHistory" class="flex items-center justify-center h-full">
    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-500 dark:border-lion-400"></div>
  </div>
  <div v-else class="h-full w-full flex flex-col text-gray-800 p-4">

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
        No conversations yet.
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
                conv.id === currentConversationId ? 'text-blue-200' : 'text-gray-500 dark:text-sunset-300'
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
import { ref, onMounted, watchEffect } from 'vue'; // <-- watchEffect added
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@clerk/vue';
import { fetchConversationHistory } from '../functions/conversation-api.js';
import Error from '../pages/Error.vue';

// --- Clerk Auth Check ---
const clerkAuth = useAuth(); // <--- Initialize Clerk Auth

const conversations = ref([]);
const isLoadingHistory = ref(true); // Default to true until loaded
const errorMessage = ref(null);
const router = useRouter();
const route = useRoute();
const currentConversationId = route.params.id || null;

async function fetchHistory() {
  if (!clerkAuth.isSignedIn.value) { // Prevent fetching if not signed in
    isLoadingHistory.value = false;
    return;
  }

  isLoadingHistory.value = true;
  errorMessage.value = null;
  try {
    const token = await clerkAuth.getToken(); // Get the auth token
    // NOTE: You'll need to modify fetchConversationHistory to accept and use the token
    conversations.value = await fetchConversationHistory(token); 
  } catch (error) {
    console.error("Failed to fetch conversation history:", error);
    errorMessage.value = "Failed to load history. Please try again.";
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

function startNewChat() {
  router.push('/chat');
}

// --- CORRECTED: Lifecycle Hook Logic ---
// We replace onMounted with watchEffect to react to the reactive clerkAuth.isLoaded Ref
watchEffect(() => {
  // Check if Clerk SDK has finished loading
  if (clerkAuth.isLoaded.value) {
    
    if (clerkAuth.isSignedIn.value) {
      // User is signed in, fetch history
      fetchHistory();
    } else {
      // If not signed in, ensure spinner stops and template renders restricted access
      isLoadingHistory.value = false;
    }
  }
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