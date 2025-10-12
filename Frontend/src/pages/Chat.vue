<template>
  <div class="flex flex-col">

    <header class="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h1 class="text-xl font-bold text-gray-800 dark:text-white truncate">
        {{ chatTitle || 'New Chat' }}
      </h1>
    </header>

    <div v-if="errorMessage" class="p-4">
      <Message severity="error" :closable="true" @close="errorMessage = null">
        {{ errorMessage }}
      </Message>
    </div>

    <main class="flex-grow overflow-y-auto p-4">
      <MessageList
        :messages="filteredMessages"
        :is-loading="isLoadingChat"
        @show-full-message="showFullMessage"
      />
      <Dialog header="Full Message" v-model:visible="isDialogVisible" modal :style="{ width: '80vw' }">
        <div class="prose dark:prose-invert max-h-[60vh] overflow-y-auto" v-html="fullMessageContent">
        </div>
        <template #footer>
          <Button label="Close" icon="pi pi-times" @click="isDialogVisible = false" class="p-button-text"></Button>
        </template>
      </Dialog>
    </main>

    <footer class="pt-4 pb-2 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">

        <div v-if="inputMode === 'buttons' && actionOptions.length" class="flex flex-col gap-3">
    
          <ActionButtons
            :options="actionOptions"
            @response="handleButtonResponse"
          />
          
          <Button
            label="Type a different response"
            icon="pi pi-keyboard"
            @click="handleSwitchToTextMode"
            class="p-button-outlined w-full"  
          />
        </div>

      <div v-else class="w-full">
        <MessageInput
          ref="messageInputComp"
          v-model="currentPrompt"
          :is-loading="isLoadingChat"
          @send="handleTextInputSend"
          placeholder="Type your message..."
        />
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { sendChatMessage, loadConversation, saveConversation } from '../functions/conversation-api';

import MessageList from '../components/chat/MessageList.vue';
import ActionButtons from '../components/chat/ActionButtons.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button'; // 👈 FIX #1: ADD THIS IMPORT
import MarkdownIt from 'markdown-it'; // 👈 FIX #2: ADD THIS IMPORT

// Initialize the markdown renderer
const md = new MarkdownIt({ html: false, linkify: true });

// --- Auth (Keep as is) ---
const authStore = useAuthStore();
const isSignedIn = computed(() => authStore.isAuthenticated);
const userId = computed(() => authStore.userId);
const getAuthToken = authStore.getToken;

// Chat State (Keep as is)
const messages = ref([]);
const currentPrompt = ref('');
const chatTitle = ref('');
const messageListComp = ref(null);
const errorMessage = ref(null);
const isLoadingChat = ref(false);
const inputMode = ref('text');
const actionOptions = ref([]);
const currentConversationId = ref(null);

const route = useRoute();
const router = useRouter();

// NEW: Ref for MessageInput to programmatically focus
const messageInputComp = ref(null); 

const isChatting = computed(() => messages.value.length > 0);
const filteredMessages = computed(() => messages.value.filter(m => m.role !== 'system'));
const isLoaded = computed(() => !authStore.loading);
const isDialogVisible = ref(false);
const fullMessageContent = ref('');

function showFullMessage(content) {
  fullMessageContent.value = md.render(content); // Now 'md' is defined
  isDialogVisible.value = true;
}

async function scrollToBottom() {
  await nextTick();
  const container = messageListComp.value?.$el;
  if (container) container.scrollTop = container.scrollHeight;
}

async function loadChatHistory(id) {
  if (!isSignedIn.value || !userId.value) return;
  isLoadingChat.value = true;
  errorMessage.value = null;

  try {
    const token = await getAuthToken();
    const conversation = await loadConversation(id, token, userId.value);
    messages.value = conversation.messages || [];
    chatTitle.value = conversation.title;
    currentConversationId.value = conversation.id;

    const last = messages.value.at(-1);
    if (last?.role === 'assistant' && last.options?.length) {
      actionOptions.value = last.options;
      inputMode.value = 'buttons';
    } else inputMode.value = 'text';
  } catch (err) {
    errorMessage.value = err.message || 'Failed to load chat.';
  } finally {
    isLoadingChat.value = false;
  }
}

function handleSwitchToTextMode() {
  inputMode.value = 'text';
  actionOptions.value = []; 
}

async function handleButtonResponse(text) {
  if (!isSignedIn.value || isLoadingChat.value) return;
  inputMode.value = 'text';
  actionOptions.value = [];
  messages.value.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
  await scrollToBottom();
  await sendMessage(text);
}

async function handleTextInputSend() {
  if (!isSignedIn.value || isLoadingChat.value) return;
  const msg = currentPrompt.value.trim();
  if (!msg) return;
  currentPrompt.value = '';
  messages.value.push({ role: 'user', content: msg, timestamp: new Date().toISOString() });
  await scrollToBottom();
  await sendMessage(msg);
}

async function sendMessage(text) {
  if (!isSignedIn.value || isLoadingChat.value) return;
  isLoadingChat.value = true;
  try {
    const token = await getAuthToken();
    const data = await sendChatMessage(text, currentConversationId.value, token, userId.value);

    messages.value.push({ role: 'assistant', content: data.response, timestamp: new Date().toISOString() });
    actionOptions.value = data.options || [];
    inputMode.value = actionOptions.value.length ? 'buttons' : 'text';
    if (data.conversationId && !currentConversationId.value) {
      currentConversationId.value = data.conversationId;
      router.replace({ params: { id: data.conversationId } });
    }
  } catch (err) {
    errorMessage.value = err.message || 'Message failed to send.';
  } finally {
    isLoadingChat.value = false;
    scrollToBottom();
  }
}

// 👇 ADD THIS FUNCTION
/**
 * Resets the chat state to a clean slate for a new conversation.
 */
function startNewChat() {
  messages.value = [];
  chatTitle.value = 'New Chat';
  currentConversationId.value = null;
  inputMode.value = 'text';
  actionOptions.value = [];
  currentPrompt.value = '';
  errorMessage.value = null;
}

// 👇 REPLACE your old watchers with this single, smarter one
watch(
  () => [route.params.id, isSignedIn.value],
  ([newId, signedIn]) => {
    // Only proceed if the authentication status is resolved
    if (!authStore.loading && signedIn) {
      if (newId) {
        // If there's an ID in the URL, load that chat
        loadChatHistory(newId);
      } else {
        // If there's no ID, start a fresh chat
        startNewChat();
      }
    } else if (!authStore.loading && !signedIn) {
      // If the user is not signed in, redirect them
      router.push('/sign-in');
    }
  },
  { immediate: true, deep: true }
);

// 4. Corrected the save logic
onBeforeUnmount(async () => {
  if (currentConversationId.value && messages.value.length > 0) {
    const token = await getAuthToken(); // Get the token
    await saveConversation(
      currentConversationId.value,
      messages.value,
      chatTitle.value,
      token, // Pass the token
      userId.value
    );
  }
});

</script>

<style scoped>
/* Keep existing styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>