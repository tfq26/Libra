<template>
  <div class="dark:bg-eerie-black-500 bg-white min-h-screen text-eerie-black font-nunito">

    <!-- Header Section with Gradient -->
    <header class="relative text-center py-20 px-6 overflow-hidden">
      <div
          class="absolute inset-0 bg-gradient-to-br from-primary-yellow via-primary-orange to-accent-brown opacity-10"
      />
      <div class="relative z-10">
        <h1 class="text-5xl md:text-6xl font-extrabold mb-4 dark:text-sandy-brown-500 text-eerie-black-100 drop-shadow-sm">
          Welcome to Libra
        </h1>
        <p class="text-lg md:text-xl dark:text-sunglow-700 text-sunglow-200 max-w-2xl mx-auto">
          Your intelligent assistant for any task — simple, fast, and always ready to help.
        </p>
      </div>
    </header>

    <div class="container mx-auto px-6 pb-20 -mt-10">
      <!-- Main Action Button -->
      <div class="flex justify-center mb-16">
        <UButton
            to="/chat"
            label="Start a New Chat"
            size="xl"
            class="bg-maize-400 text-bittersweet-500 font-nunito hover:bg-accent-brown font-bold px-8 py-4 rounded-full shadow-lg transition-transform transform hover:scale-105"
            icon="i-heroicons-sparkles-20-solid"
        />
      </div>

      <!-- Recent Chats Section -->
      <section>
        <h2 class="text-3xl font-bold mb-8 pb-3 text-bittersweet-500">
          Recent Chats
        </h2>

        <div
            v-if="recentChats.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <!-- Loop through recent chats -->
          <UCard
              v-for="chat in recentChats"
              :key="chat.id"
              class="hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer bg-white border border-borders rounded-2xl"
              @click="navigateToChat(chat.id)"
          >
            <template #header>
              <h3 class="font-semibold text-lg truncate text-eerie-black">
                {{ chat.title }}
              </h3>
            </template>

            <p class="text-gray-500 text-sm">
              Last message: {{ new Date(chat.lastMessageDate).toLocaleDateString() }}
            </p>

            <template #footer>
              <UButton
                  variant="link"
                  label="Continue Chat"
                  :padded="false"
                  class="text-primary-orange hover:text-accent-brown font-medium"
                  trailing-icon="i-heroicons-arrow-right-20-solid"
              />
            </template>
          </UCard>
        </div>

        <!-- Placeholder for when there are no recent chats -->
        <div
            v-else
            class="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-borders"
        >
          <UIcon name="i-heroicons-chat-bubble-left-right" class="text-4xl text-gray-300 mx-auto mb-4" />
          <p class="text-gray-600 font-medium">You have no recent chats yet.</p>
          <p class="text-gray-400 mt-2">Start a new conversation to see it here!</p>
        </div>
      </section>

      <!-- View All History Link -->
      <div class="text-center mt-16">
        <UButton
            to="/history"
            label="View All History"
            variant="link"
            size="lg"
            class="text-primary-orange hover:text-accent-brown font-semibold"
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

