<template>
  <div v-if="clerkAuth.isLoaded.value && !clerkAuth.isSignedIn.value" class="flex items-center justify-center h-full text-center p-8">
    <Error :message="'Please sign in to access this chat'" code="402" />
  </div>

  <div v-else class="flex font-sans overflow-hidden h-full">
    <main class="flex-grow flex flex-col p-2 shadow-xl">

      <header class="mb-2 flex items-start flex-shrink-0 dark:text-sunset-300 justify-start">
        <div class="border-b border-gray-700 w-full pb-2">
          <h1 class="text-5xl font-bold text-gray-800 dark:text-sunset-200 truncate text-start">{{ chatTitle }}</h1>
        </div>
      </header>

      <MessageList
        ref="messageListComp"
        :messages="filteredMessages"
        :is-loading="isLoadingChat"
      />

      <Error
        v-if="errorMessage"
        :message="errorMessage"
        @dismiss="errorMessage = null"
      />

      <div class="mt-2 flex-shrink-0">
        <div v-if="inputMode === 'buttons' && actionOptions.length > 0 && !isLoadingChat" class="flex items-end space-x-2">
          <ActionButtons class="flex-grow" :options="actionOptions" @response="handleButtonResponse" />

          <button @click="inputMode = 'text'" class="p-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition" title="Type a custom message">
            ...
          </button>
        </div>

        <MessageInput
          v-else
          v-model="currentPrompt"
          :is-loading="isLoadingChat"
          :placeholder="isChatting ? 'Type your message...' : 'Describe your issue to begin.'"
          @send="handleTextInputSend"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watchEffect } from 'vue'; // <-- watchEffect added
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@clerk/vue';
import { sendChatMessage, loadConversation } from '../functions/chat-api.js';
// Import all the necessary components
import MessageList from '../components/chat/MessageList.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import Error from '../pages/Error.vue';
import ActionButtons from '../components/chat/ActionButtons.vue';

// --- Clerk Auth Check ---
const clerkAuth = useAuth(); // <--- Initialize Clerk Auth

// --- State for a single chat session ---
const messages = ref([]);
const currentConversationId = ref(null);
const currentPrompt = ref('');
const isLoadingChat = ref(false);
const chatTitle = ref('');
const chatSubtitle = ref('');
const messageListComp = ref(null);
const errorMessage = ref(null);

// NEW: State for managing the input mode and button options
const inputMode = ref('text'); // 'text' or 'buttons'
const actionOptions = ref([]);

const route = useRoute();
const router = useRouter();

const isChatting = computed(() => messages.value.length > 0);
const filteredMessages = computed(() => messages.value.filter(msg => msg.role !== 'system'));


async function scrollToBottom() {
  await nextTick();
  const container = messageListComp.value?.$el.querySelector('#messages-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// --- NEW: Function to load an existing chat ---
async function loadChatHistory(id) {
  if (!clerkAuth.isSignedIn.value) return; // Prevent API call if not signed in

  isLoadingChat.value = true;
  errorMessage.value = null;
  try {
    // Await the token safely (getToken returns a Promise)
    const token = await clerkAuth.getToken(); 
    const conversation = await loadConversation(id, token);
    messages.value = conversation.messages || [];
    chatTitle.value = conversation.title;
    chatSubtitle.value = `Conversation started on ${new Date(conversation.createdAt).toLocaleDateString()}`;
    currentConversationId.value = conversation.id;

    // Check the last message from the assistant to restore buttons
    const lastMessage = messages.value[messages.value.length - 1];
    if(lastMessage?.role === 'assistant' && lastMessage.options) {
      actionOptions.value = lastMessage.options;
      inputMode.value = 'buttons';
    } else {
      inputMode.value = 'text';
    }

  } catch (error) {
    console.error("Failed to load conversation:", error);
    errorMessage.value = "Could not load the requested chat. It might not exist or access is denied.";
    startNewChat();
  } finally {
    isLoadingChat.value = false;
    await scrollToBottom();
  }
}

function clearErrorAndRetry() {
  errorMessage.value = null;
  const chatId = route.params.id;
  if (chatId) {
    loadChatHistory(chatId);
  } else {
    startNewChat();
  }
}

function startNewChat() {
  currentConversationId.value = null;
  messages.value = [];
  currentPrompt.value = '';
  errorMessage.value = null;
  inputMode.value = 'text';
  actionOptions.value = [];
  chatTitle.value = "New Chat";
  chatSubtitle.value = "Describe your issue to begin.";
  if (route.params.id) {
    router.push('/chat');
  }
  nextTick(() => document.querySelector('input')?.focus());
}

async function handleButtonResponse(responseText) {
  if (!clerkAuth.isSignedIn.value) return;
  messages.value.push({ role: 'user', content: responseText });
  await scrollToBottom();
  await sendMessage(responseText);
}

async function handleTextInputSend() {
    if (!clerkAuth.isSignedIn.value) return;
    await sendMessage(currentPrompt.value);
    currentPrompt.value = '';
}

async function sendMessage(prompt) {
  if (!clerkAuth.isSignedIn.value) return; // Final auth check

  const promptText = prompt.trim();
  if (!promptText || isLoadingChat.value) return;

  errorMessage.value = null;
  isLoadingChat.value = true;
  actionOptions.value = [];

  if (currentConversationId.value === null) {
    chatTitle.value = promptText.substring(0, 30) + '...';
    chatSubtitle.value = '';
  }

  // Only push if it's not a duplicate of the last message (e.g., from a button click leading here)
  if (messages.value.length === 0 || messages.value[messages.value.length - 1]?.content !== promptText) {
    messages.value.push({ role: 'user', content: promptText });
  }

  await scrollToBottom();

  try {
    const token = await clerkAuth.getToken(); // <--- Get the auth token
    const data = await sendChatMessage(promptText, currentConversationId.value, token); // <--- Pass the token

    messages.value.push({ role: 'assistant', content: data.response });
    actionOptions.value = data.options || []; // Ensure it's an array
    inputMode.value = actionOptions.value.length > 0 ? 'buttons' : 'text'; // Determine input mode

    if (data.isDone) {
            inputMode.value = 'text';
            actionOptions.value = [];

            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);
        }

    if (!currentConversationId.value) {
      currentConversationId.value = data.conversationId;
    }

  } catch (error) {
    console.error("Error sending message:", error);
    errorMessage.value = error.message;
    inputMode.value = 'text';
    // Logic to clean up if the message push before the try block was based on an assumption
    // For simplicity, we'll keep the message there for now and let the user re-try or see the error
  } finally {
    isLoadingChat.value = false;
    scrollToBottom();
  }
}

// --- CORRECTED: Lifecycle Hook Logic ---
// We replace onMounted with watchEffect to react to the reactive clerkAuth.isLoaded Ref
watchEffect(() => {
  // Check if Clerk SDK has finished loading and we have a valid sign-in status
  if (clerkAuth.isLoaded.value) {
    const chatId = route.params.id;
    
    if (clerkAuth.isSignedIn.value) {
      // User is signed in, proceed to load chat or start new one
      if (chatId) {
        loadChatHistory(chatId);
      } else {
        startNewChat();
      }
    }
  }
});
</script>