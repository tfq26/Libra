<template>
  <div class="flex flex-col h-full px-2">

    <header class="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h1 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">
        {{ chatTitle || 'New Chat' }}
      </h1>
    </header>

    <div v-if="errorMessage" class="p-4">
      <Message severity="error" :closable="true" @close="errorMessage = null">
        {{ errorMessage }}
      </Message>
    </div>

    <main class="flex-grow overflow-y-auto">
      <MessageList
        ref="messageListComp" :messages="filteredMessages"
        :is-loading="isLoadingChat"
        @show-full-message="showFullMessage"
      />
      <Dialog 
        header="Full Message" 
        v-model:visible="isDialogVisible" 
        modal 
        :style="{ width: '90vw', maxWidth: '600px'}"
      >
        <div 
          class="prose dark:prose-invert max-h-[70vh] overflow-y-auto" 
          v-html="fullMessageContent"
        >
        </div>
        <template #footer>
          <Button label="Close" icon="pi pi-times" @click="isDialogVisible = false" class="p-button-text"></Button>
        </template>
      </Dialog>
    </main>

    <footer class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-2">
      <div v-if="inputMode === 'buttons' && actionOptions.length" class="flex flex-col gap-3 p-2">
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

import { sendChatMessage, loadConversation } from '../functions/conversation-api';
import { saveConversation } from '../functions/history-api'; 

import MessageList from '../components/chat/MessageList.vue';
import ActionButtons from '../components/chat/ActionButtons.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true });

const authStore = useAuthStore();
const isSignedIn = computed(() => authStore.isAuthenticated);
const userId = computed(() => authStore.userId);
const getAuthToken = authStore.getToken;

const messages = ref([]);
const currentPrompt = ref('');
const chatTitle = ref('');
const messageListComp = ref(null);
const errorMessage = ref(null);
const isLoadingChat = ref(false);
const inputMode = ref('text');
const actionOptions = ref([]);
const currentConversationId = ref(null);
const hasUnsavedChanges = ref(false);
let saveTimeout = null;
const route = useRoute();
const router = useRouter();
const isInitialLoad = ref(true);
const messageInputComp = ref(null); 
const filteredMessages = computed(() => messages.value.filter(m => m.role !== 'system'));
const isDialogVisible = ref(false);
const fullMessageContent = ref('');

function showFullMessage(content) {
  fullMessageContent.value = md.render(content);
  isDialogVisible.value = true;
}

async function scrollToBottom() {
  await nextTick();
  // Correctly access the exposed ref from the child component
  const container = messageListComp.value?.messagesContainer;
  if (container) {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }
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

    // --- START: The only change you need ---
    // If the API response includes a title and we are in a new chat, update it.
    if (data.title && !currentConversationId.value) {
      chatTitle.value = data.title;
    }
    // --- END: The only change you need ---

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

const saveChat = async () => {
  if (currentConversationId.value && messages.value.length > 0 && hasUnsavedChanges.value) {
    try {
      await saveConversation(
        currentConversationId.value,
        messages.value,
        chatTitle.value,
        userId.value
      );
      hasUnsavedChanges.value = false;
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  }
};

function startNewChat() {
  messages.value = [];
  chatTitle.value = 'New Chat';
  currentConversationId.value = null;
  inputMode.value = 'text';
  actionOptions.value = [];
  currentPrompt.value = '';
  errorMessage.value = null;
}

watch([messages, chatTitle], () => {
  // Only set up a save timeout if the chat has a real ID
  if (isSignedIn.value && currentConversationId.value && messages.value.length > 0) {
    hasUnsavedChanges.value = true;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveChat, 2000);
  }
}, { deep: true });

watch(
  () => [route.params.id, isSignedIn.value, authStore.loading],
  // The fix is here: '= []' is added to the second parameter
  async ([newId, signedIn, isLoading], [oldId, oldSignedIn, oldIsLoading] = []) => {
    // 1. Do nothing if authentication is still loading
    if (isLoading) return;

    // 2. Save any pending changes before navigating away
    if (oldId && newId !== oldId && hasUnsavedChanges.value) {
      await saveChat();
    }

    // 3. Handle user signing out
    if (signedIn === false && oldSignedIn === true) {
      router.push('/sign-in');
      return;
    }
    
    // 4. Handle user signing in or initial load
    if (signedIn && oldSignedIn !== true) {
        if (newId) {
            await loadChatHistory(newId);
        } else {
            startNewChat();
        }
        return;
    }

    // 5. Handle navigation between chats
    if (signedIn && newId !== oldId) {
      // THIS IS THE KEY: If oldId is undefined, it means we just created this chat.
      // The component state is already up-to-date, so we DO NOT reload.
      if (oldId === undefined) {
        return; 
      }
      
      if (newId) {
        // This handles navigating from one existing chat to another.
        await loadChatHistory(newId);
      } else {
        // This handles navigating from an existing chat to the "New Chat" page.
        startNewChat();
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(async () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  if (hasUnsavedChanges.value) {
    await saveChat();
  }
});

const handleBeforeUnload = (e) => {
  if (hasUnsavedChanges.value) {
    // This will show a confirmation dialog
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (saveTimeout) clearTimeout(saveTimeout);
});
</script>
