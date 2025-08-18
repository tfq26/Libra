<template>
  <div class="bg-eerie-black-900 min-h-screen text-eerie-black-100">
    <div class="container mx-auto p-6 md:p-10">

      <!-- Header Section -->
      <header class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold mb-2 text-maize-400">Welcome to Libra</h1>
        <p class="text-lg text-eerie-black-700">Your intelligent assistant for any task.</p>
      </header>

      <!-- Main Action -->
      <div class="flex justify-center mb-16">
        <UButton
            to="/chat"
            label="Start a New Chat"
            size="xl"
            class="bg-bittersweet-500 hover:bg-bittersweet-400 text-white font-bold transition-transform transform hover:scale-105"
            icon="i-heroicons-plus-circle"
        />
      </div>

      <!-- Recent Chats Section -->
      <div>
        <h2 class="text-2xl font-bold mb-6 border-b-2 border-eerie-black-300 pb-2 text-sunglow-400">
          Recent Chats
        </h2>

        <div v-if="recentChats.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Loop through recent chats -->
          <UCard
              v-for="chat in recentChats"
              :key="chat.id"
              class="hover:shadow-xl transition-shadow cursor-pointer bg-white border border-eerie-black-200"
              @click="navigateToChat(chat.id)"
          >
            <template #header>
              <h3 class="font-semibold text-lg truncate text-eerie-black-600">{{ chat.title }}</h3>
            </template>

            <p class="text-eerie-black-500 text-sm">
              Last message: {{ new Date(chat.lastMessageDate).toLocaleDateString() }}
            </p>

            <template #footer>
              <UButton
                  variant="link"
                  label="Continue Chat"
                  :padded="false"
                  class="text-sandy-brown-500 hover:text-sandy-brown-400"
              />
            </template>
          </UCard>
        </div>

        <!-- Placeholder for when there are no recent chats -->
        <div
            v-else
            class="text-center py-10 px-6 bg-eerie-black-800 rounded-lg border border-dashed border-eerie-black-400"
        >
          <p class="text-eerie-black-200">You have no recent chats.</p>
          <p class="text-eerie-black-400 mt-2">Start a new conversation to see it here!</p>
        </div>
      </div>

      <!-- View All History Link -->
      <div class="text-center mt-12">
        <UButton
            to="/history"
            label="View All History"
            variant="link"
            size="lg"
            class="text-sandy-brown-500 hover:text-sandy-brown-400 font-semibold"
            trailing-icon="i-heroicons-arrow-right"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// --- Mock Data ---
const recentChats = ref([
  { id: 'convo-1', title: 'iPhone 11 not turning on', lastMessageDate: '2025-08-15T10:00:00Z' },
  { id: 'convo-2', title: 'How to make sourdough bread', lastMessageDate: '2025-08-14T15:30:00Z' },
  { id: 'convo-3', title: 'Planning a trip to Japan', lastMessageDate: '2025-08-12T09:12:00Z' },
]);

// --- Navigation ---
const navigateToChat = (chatId) => {
  router.push(`/chat?id=${chatId}`);
};
</script>
