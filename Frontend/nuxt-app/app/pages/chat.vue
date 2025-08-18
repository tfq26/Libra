<template>
  <div class="bg-eerie-black-500 min-h-screen flex flex-col font-nunito">
    <!-- Chat Header -->
    <header class="bg-eerie-black-400 border-b border-eerie-black-600 p-4 shadow-md sticky top-0 z-10">
      <div class="container mx-auto flex items-center justify-between">
        <h1 class="text-xl font-bold text-sunglow-400">Libra Chat</h1>
        <!-- We can add more controls here later, like a "New Chat" button -->
      </div>
    </header>

    <!-- Messages Area -->
    <main ref="chatContainer" class="flex-1 overflow-y-auto p-6">
      <div class="container mx-auto space-y-6">
        <!-- Loop through messages -->
        <div
            v-for="(message, index) in messages"
            :key="index"
            class="flex"
            :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
              class="max-w-lg px-5 py-3 rounded-2xl shadow"
              :class="message.role === 'user'
              ? 'bg-sandy-brown-500 text-eerie-black-500'
              : 'bg-eerie-black-400 text-eerie-black-900'"
          >
            <p class="whitespace-pre-wrap">{{ message.content }}</p>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="isLoading" class="flex justify-start">
          <div class="max-w-lg px-5 py-3 rounded-2xl shadow bg-eerie-black-400 text-eerie-black-900">
            <p class="animate-pulse">Thinking...</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Input Form -->
    <footer class="bg-eerie-black-400 border-t border-eerie-black-600 p-4 sticky bottom-0">
      <div class="container mx-auto">
        <form class="flex items-center space-x-4" @submit.prevent="sendMessage">
          <UTextarea
              v-model="inputValue"
              placeholder="Ask Libra anything..."
              autoresize
              :rows="1"
              :maxrows="5"
              class="flex-1"
              :ui="{ base: 'bg-eerie-black-500 border-eerie-black-600 text-eerie-black-900 w-full p-4 focus:ring-sunglow-400 focus:border-sunglow-400' }"
              @keydown.enter.exact.prevent="sendMessage"
          />
          <UButton
              type="submit"
              icon="i-material-symbol-send"
              size="lg"
              :loading="isLoading"
              class="bg-bittersweet-500 hover:bg-bittersweet-400 text-white rounded-full"
          />
        </form>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const messages = ref([]);
const inputValue = ref('');
const isLoading = ref(false);
const conversationId = ref(null);
const chatContainer = ref(null);

// --- Hardcoded User ID for now ---
// In a real app, this would come from your authentication state (e.g., a Pinia store or composable)
const userId = 'user-123-test';

// --- Scroll to Bottom ---
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// --- Fetch Existing Conversation ---
onMounted(async () => {
  const idFromUrl = route.query.id;
  if (idFromUrl) {
    conversationId.value = idFromUrl;
    isLoading.value = true;
    try {
      // UPDATED: Call the new GET endpoint on the /chat function
      const response = await $fetch(`/api/chat?id=${idFromUrl}&userId=${userId}`, {
        method: 'GET'
      });
      messages.value = response.messages;
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      messages.value = [{ role: 'assistant', content: 'Sorry, I couldn\'t load our previous conversation. Let\'s start fresh!' }];
    } finally {
      isLoading.value = false;
      scrollToBottom();
    }
  } else {
    messages.value = [{ role: 'assistant', content: 'Hello! How can I assist you today?' }];
  }
});

// --- Send a Message ---
const sendMessage = async () => {
  if (inputValue.value.trim() === '' || isLoading.value) return;

  const userMessage = { role: 'user', content: inputValue.value };
  messages.value.push(userMessage);
  const prompt = inputValue.value;
  inputValue.value = '';
  isLoading.value = true;
  scrollToBottom();

  try {
    // UPDATED: Ensure userId is sent in the POST request body
    const response = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        prompt,
        userId,
        conversationId: conversationId.value,
      },
    });

    const aiMessage = { role: 'assistant', content: response.response };
    messages.value.push(aiMessage);

    if (!conversationId.value) {
      conversationId.value = response.conversationId;
    }

  } catch (error) {
    console.error("Error sending message:", error);
    const errorMessage = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
    messages.value.push(errorMessage);
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};
</script>

<style scoped>
/* Ensure smooth scrolling */
.overflow-y-auto {
  scroll-behavior: smooth;
}
/* Custom placeholder color for dark mode */
::placeholder {
  color: var(--color-eerie-black-700);
  opacity: 1;
}
</style>
