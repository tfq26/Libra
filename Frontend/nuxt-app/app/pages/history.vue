<template>
  <div class="bg-eerie-black-500 min-h-screen font-nunito text-eerie-black-900">
    <div class="container mx-auto px-6 py-10 md:px-10 lg:px-16">

      <!-- Page Header -->
      <header class="mb-10">
        <h1 class="text-4xl font-extrabold text-sunglow-400">Conversation History</h1>
        <p class="text-lg text-eerie-black-700 mt-2">Review your past conversations with Libra.</p>
      </header>

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <USkeleton class="h-24 w-full" v-for="i in 3" :key="i" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12 px-6 bg-eerie-black-400 rounded-2xl border border-dashed border-bittersweet-500">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-5xl text-bittersweet-500 mx-auto mb-4" />
        <p class="text-eerie-black-700 font-medium">Could not load history.</p>
        <p class="text-eerie-black-800 mt-2">There was an error fetching your conversations. Please try again later.</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="conversations.length === 0" class="text-center py-12 px-6 bg-eerie-black-400 rounded-2xl border border-dashed border-eerie-black-600">
        <UIcon name="i-heroicons-chat-bubble-left-right" class="text-5xl text-eerie-black-600 mx-auto mb-4" />
        <p class="text-eerie-black-700 font-medium">No conversations yet.</p>
        <p class="text-eerie-black-800 mt-2">Start a new chat to see your history here!</p>
        <UButton to="/chat" label="Start Chatting" class="mt-6 bg-sandy-brown-500 hover:bg-sandy-brown-400 text-eerie-black-900" />
      </div>

      <!-- History List -->
      <div v-else class="space-y-4">
        <UCard
            v-for="chat in conversations"
            :key="chat.id"
            class="hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer bg-eerie-black-400 border border-eerie-black-600"
            @click="navigateToChat(chat.id)"
        >
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-semibold text-lg text-sunglow-300 truncate">{{ chat.title }}</h3>
              <p class="text-sm text-eerie-black-700 mt-1">
                Started on: {{ new Date(chat.createdAt).toLocaleDateString() }}
              </p>
            </div>
            <UIcon name="i-heroicons-chevron-right-20-solid" class="text-eerie-black-700" />
          </div>
        </UCard>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/user.js';

// This tells Nuxt to run our 'auth' middleware before rendering this page
definePageMeta({
  middleware: 'auth'
});

const router = useRouter();
const userStore = useUserStore();

const conversations = ref([]);
const isLoading = ref(true);
const error = ref(null);

// --- Fetch History from Backend ---
onMounted(async () => {
  // Ensure we have a userId before fetching
  if (!userStore.userId) {
    error.value = new Error("User is not authenticated.");
    isLoading.value = false;
    return;
  }

  try {
    const response = await $fetch(`/api/history?userId=${userStore.userId}`, {
      method: 'GET'
    });
    conversations.value = response;
  } catch (e) {
    console.error("Failed to fetch history:", e);
    error.value = e;
  } finally {
    isLoading.value = false;
  }
});

// --- Navigation ---
const navigateToChat = (chatId) => {
  router.push(`/chat?id=${chatId}`);
};
</script>
