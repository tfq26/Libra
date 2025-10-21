<template>
  <div class="flex flex-col h-full px-2">

    <header class="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h1 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">
        {{ chatTitle || 'New Chat' }}
      </h1>
    </header>
    
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
import { onBeforeRouteLeave } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToast } from 'primevue/usetoast';
import { navigateToError } from '../router';

import { sendChatMessage, loadConversation, parseAIResponse } from '../functions/conversation-api';
import { initConversation } from '../functions/conversation-api';
import { saveConversation } from '../functions/history-api'; 
import { useConversationStore } from '../stores/conversationStore'; // 👈 Add this import

import MessageList from '../components/chat/MessageList.vue';
import ActionButtons from '../components/chat/ActionButtons.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import MarkdownIt from 'markdown-it';
import Toast from 'primevue/toast';
import { contentToString } from '../utils/content.js';

const md = new MarkdownIt({ html: false, linkify: true });

const authStore = useAuthStore();
const isSignedIn = computed(() => authStore.isAuthenticated);
const userId = computed(() => authStore.userId);
const getAuthToken = authStore.getToken;
const conversationStore = useConversationStore();
const messages = ref([]);
const currentMessage = ref(""); // The message being streamed in
const currentPrompt = ref('');
const toast = useToast();
const error = ref(null);
const chatTitle = ref('');
const messageListComp = ref(null);
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
const toastLocal = useToast();
const bypassUnsavedPrompt = ref(false);

/**
 * Perform a lightweight system health check by calling the backend warm endpoint.
 * Throws an Error when the system is not healthy or the backend reports problems.
 */
async function checkSystemHealth() {
  try {
    const resp = await fetch('/api/warm', { method: 'GET' });
    if (!resp.ok) {
      let errText = await resp.text().catch(() => 'Warm endpoint returned non-OK');
      throw new Error(errText || 'Warm endpoint returned non-OK');
    }
    const data = await resp.json().catch(() => ({}));
    if (data && data.warmed === false) {
      throw new Error(data.error || 'Warm endpoint reported failure');
    }
    return true;
  } catch (err) {
    // Normalize to Error
    throw err instanceof Error ? err : new Error(String(err));
  }
}

function isAutoRestoreEnabled() {
  try {
    const v = localStorage.getItem('libra:autoRestoreDrafts');
    // default: true to preserve current behavior; store explicitly to change
    return v === null ? true : v === 'true';
  } catch (e) {
    return true;
  }
}

// Track previous user id so we can clear storage on sign-out
let prevUserId = null;

// Broadcast / storage synchronization setup
let bc = null;
const storageKeyFor = (uid) => `libra:currentConversation:${uid}`;

function broadcastConversationId(userId, convoId) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      if (!bc) bc = new BroadcastChannel('libra:conversation');
      bc.postMessage({ userId, conversationId: convoId });
    } else {
      // fallback: localStorage write triggers storage events in other tabs
      if (userId) {
        const key = storageKeyFor(userId);
        if (convoId === null || convoId === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, convoId);
        }
      }
    }
  } catch (e) {
    console.warn('Broadcast failed:', e.message || e);
  }
}

function handleIncomingBroadcast(e) {
  try {
    const msg = e?.data || e;
    if (!msg) return;
    const { userId: msgUser, conversationId: msgConvo } = msg;
    if (!msgUser || msgUser !== userId.value) return;
    if (msgConvo && msgConvo !== currentConversationId.value) {
      if (isAutoRestoreEnabled()) {
        currentConversationId.value = msgConvo;
        router.replace({ params: { id: msgConvo } });
        // Load the conversation into the UI
        loadChatHistory(msgConvo).catch(() => {});
        toastLocal.add({ severity: 'info', summary: 'Draft restored', detail: 'Restored draft conversation from another tab.' });
      } else {
        toastLocal.add({ severity: 'info', summary: 'Draft available', detail: 'A draft conversation is available in another tab. Enable auto-restore in your Account menu to load automatically.' });
      }
    }
    if (msgConvo === null) {
      // clear
      if (!route.params.id) startNewChat();
    }
  } catch (err) {
    console.warn('Error handling incoming broadcast', err.message || err);
  }
}

function handleStorageEvent(e) {
  if (!e || !e.key) return;
  const expectedKey = storageKeyFor(userId.value);
  if (e.key !== expectedKey) return;
  const newVal = e.newValue;
  if (newVal && newVal !== currentConversationId.value) {
    if (isAutoRestoreEnabled()) {
      currentConversationId.value = newVal;
      router.replace({ params: { id: newVal } });
      loadChatHistory(newVal).catch(() => {});
      toastLocal.add({ severity: 'info', summary: 'Draft restored', detail: 'Restored draft conversation from another tab.' });
    } else {
      toastLocal.add({ severity: 'info', summary: 'Draft available', detail: 'A draft conversation is available in another tab. Enable auto-restore in your Account menu to load automatically.' });
    }
  }
}

// use shared contentToString imported above

function showFullMessage(content) {
  const text = contentToString(content);
  fullMessageContent.value = md.render(text);
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

/**
 * Loads the full message history for a single conversation, using the Pinia store for caching.
 * It will first check the local cache before making an API call.
 * @param {string} id The ID of the conversation to load.
 */
async function loadChatHistory(id) {
  if (!isSignedIn.value || !userId.value) return;
  // Make sure the system is healthy before loading a conversation.
  try {
    await checkSystemHealth();
  } catch (err) {
    bypassUnsavedPrompt.value = true;
    navigateToError({ code: err.status || 500, message: err.message || 'System health check failed', details: err.stack || err });
    return;
  }
  isLoadingChat.value = true;

  try {
    const token = await getAuthToken();
    
    // 💥 CHANGE: Call the Pinia store's action instead of the raw API function.
    // This handles all the client-side caching logic for you.
    const conversation = await conversationStore.getConversation(id, token, userId.value);
    
    messages.value = conversation.messages || [];
    chatTitle.value = conversation.title;
    currentConversationId.value = conversation.id;

    // If the backend inserted an assistant error marker message, navigate to the error page.
    try {
      const lastAssistant = [...messages.value].reverse().find(m => m.role === 'assistant');
      if (lastAssistant) {
        const text = contentToString(lastAssistant.content || '');
        if (text && (text.startsWith('[ERROR]') || text.includes("I'm sorry, I encountered an error"))) {
          bypassUnsavedPrompt.value = true;
          navigateToError({ code: 500, message: text.replace(/^\[ERROR\]\s*/i, ''), details: text });
          return;
        }
      }
    } catch (e) {
      console.warn('Error detecting assistant error message:', e && e.message ? e.message : e);
    }

    const last = messages.value.at(-1);
    if (last?.role === 'assistant' && last.options?.length) {
      actionOptions.value = last.options;
      inputMode.value = 'buttons';
    } else inputMode.value = 'text';

  } catch (err) {
    toast.add({ 
      severity: 'error', 
      summary: 'Load Error', 
      detail: err.message || 'Failed to load chat.', 
      life: 5000 
    });
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
  // normalize content shape and mark that we've already pushed the message
  messages.value.push({ role: 'user', content: { text }, timestamp: new Date().toISOString() });
  await scrollToBottom();
  await sendMessage(text, true);
}

async function handleTextInputSend() {
  if (!isSignedIn.value || isLoadingChat.value) return;
  const msg = currentPrompt.value.trim();
  if (!msg) return;
  currentPrompt.value = '';
  // push a normalized user message object then send; avoid duplication in sendMessage
  messages.value.push({ role: 'user', content: { text: msg }, timestamp: new Date().toISOString() });
  await scrollToBottom();
  await sendMessage(msg, true);
}

/**
 * Sends a user's message, handles the streaming response, and invalidates the local cache upon completion.
 * @param {string} userPrompt The text content from the user's input.
 */
async function sendMessage(userPrompt, alreadyPushed = false) {
  // 1. PRE-FLIGHT CHECKS & STATE SETUP (No changes)
  if (isLoadingChat.value || !isSignedIn.value) return;
  if (!userPrompt || userPrompt.trim() === '') return;

  isLoadingChat.value = true;
  error.value = null;
  actionOptions.value = [];
  inputMode.value = 'text';
  const promptToSend = userPrompt;

  // 2. IMMEDIATE UI UPDATES (No changes)
  // If the caller hasn't already pushed the user's message into the UI, do so now.
  if (!alreadyPushed) {
    messages.value.push({
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: { text: promptToSend },
      timestamp: new Date().toISOString(),
    });
  }

  const assistantMessageId = 'temp-assistant-' + Date.now();
  messages.value.push({
    id: assistantMessageId,
    role: 'assistant',
    content: { text: '' },
    timestamp: new Date().toISOString(),
  });

  currentPrompt.value = '';
  scrollToBottom();

  // 3. API CALL & STREAM HANDLING
  try {
    const token = await getAuthToken();
    const response = await fetch('/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        message: promptToSend,
        conversationId: currentConversationId.value,
        userId: userId.value,
      }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'The server returned an error.');
    }

    // --- 💥 MODIFIED STREAM PROCESSING ---
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const assistantMessage = messages.value.find(m => m.id === assistantMessageId);
    
    let fullAIResponse = ''; // 👈 Accumulate the full raw response here

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullAIResponse += chunk; // 👈 Append raw chunk to the full response string

      // 👈 Parse the entire accumulated response on every chunk
      const parsed = parseAIResponse(fullAIResponse);

      // 👈 Update the UI with the CLEAN message
      assistantMessage.content.text = parsed.cleanMessage; 
      
      scrollToBottom();
    }

    // --- POST-STREAM UI UPDATE ---
    // The stream is finished. Now use the final parsed result to set the buttons.
    const finalParsed = parseAIResponse(fullAIResponse);
    if (finalParsed.options && finalParsed.options.length > 0) {
      actionOptions.value = finalParsed.options;
      inputMode.value = 'buttons';
    }

  } catch (err) {
    // 4. ERROR HANDLING (No changes here)
    error.value = err.message || String(err);
    const assistantMessage = messages.value.find(m => m.id === assistantMessageId);
    if(assistantMessage) {
        assistantMessage.content.text = `Sorry, an error occurred: ${err.message}`;
    }
    
    toast.add({
      severity: 'error',
      summary: 'Request Failed',
      detail: err.message || 'Could not get a response from the assistant.',
      life: 5000,
    });

    try {
      const payload = {
        code: err.status || err.code || 500,
        message: err.message || 'An unexpected error occurred',
        error: err.name || 'Error',
      };
      if (import.meta.env.DEV) {
        payload.details = err.stack || JSON.stringify(err);
      }
      bypassUnsavedPrompt.value = true;
      navigateToError(payload);
    } catch (navErr) {
      console.error('Failed to navigate to error page:', navErr);
    }

  } finally {
    // 5. CLEANUP
    isLoadingChat.value = false;
    scrollToBottom();
    
    // 💥 CHANGE: Invalidate the Pinia cache for this conversation.
    // This is crucial. It ensures that the next time loadChatHistory is called
    // for this ID, it will re-fetch the fresh data from the server instead
    // of showing the old, stale version from before your message was sent.
    if (currentConversationId.value) {
      conversationStore.invalidateConversation(currentConversationId.value);
    }
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
  // If user is signed in, pre-create a draft conversation so subsequent sends have an ID
  (async () => {
    if (isSignedIn.value) {
      try {
        const token = await getAuthToken();
        const data = await initConversation(token);
        if (data && data.conversationId) {
          currentConversationId.value = data.conversationId;
          // Persist & broadcast
          broadcastConversationId(userId.value, data.conversationId);
          localStorage.setItem(storageKeyFor(userId.value), data.conversationId);
          // Update route without reloading
          router.replace({ params: { id: data.conversationId } });
        }
      } catch (e) {
        console.warn('Could not initialize draft conversation:', e.message || e);
      }
    }
  })();
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
  // If we're bypassing unsaved prompts (navigating to error), skip the confirmation
  if (bypassUnsavedPrompt.value) return;

  if (hasUnsavedChanges.value) {
    // This will show a confirmation dialog
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  // Initialize BroadcastChannel if supported
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('libra:conversation');
      bc.onmessage = handleIncomingBroadcast;
    }
  } catch (e) {
    console.warn('BroadcastChannel not available:', e.message || e);
  }

  // Restore stored conversationId for current user (if any)
  (async () => {
    // Run a quick system health check before attempting to restore or load chats.
    try {
      await checkSystemHealth();
    } catch (err) {
      bypassUnsavedPrompt.value = true;
      navigateToError({ code: err.status || 500, message: err.message || 'System health check failed', details: err.stack || err });
      return;
    }
    // Wait until auth is resolved
    if (authStore.loading) {
      const unwatch = watch(() => authStore.loading, async (val) => {
        if (!val) {
          unwatch();
          if (authStore.isAuthenticated) {
            const key = storageKeyFor(authStore.userId);
            const stored = localStorage.getItem(key);
            if (stored) {
              currentConversationId.value = stored;
              router.replace({ params: { id: stored } });
              await loadChatHistory(stored).catch(() => {});
            }
          }
        }
      });
    } else {
      if (authStore.isAuthenticated) {
        const key = storageKeyFor(authStore.userId);
        const stored = localStorage.getItem(key);
        if (stored) {
          currentConversationId.value = stored;
          router.replace({ params: { id: stored } });
          await loadChatHistory(stored).catch(() => {});
        }
      }
    }
  })();

  // Listen for storage events (fallback for BroadcastChannel)
  window.addEventListener('storage', handleStorageEvent);
});

// Prompt when navigating away in-app if there are unsaved changes
onBeforeRouteLeave((to, from, next) => {
  // Skip the unsaved-changes prompt when we're intentionally bypassing it (e.g., error redirect)
  if (bypassUnsavedPrompt.value) return next();

  if (hasUnsavedChanges.value) {
    const confirmLeave = window.confirm('You have unsaved changes in this conversation. Are you sure you want to leave?');
    if (!confirmLeave) return next(false);
  }
  return next();
});

// Clear persisted conversation when the user signs out
watch(() => authStore.userId, (newUid, oldUid) => {
  // If user just signed out (oldUid exists, newUid is null), clear persisted data
  if (!newUid && oldUid) {
    try {
      localStorage.removeItem(storageKeyFor(oldUid));
      broadcastConversationId(oldUid, null);
      // Notify the user that the draft was cleared
      try {
        toastLocal.add({ severity: 'info', summary: 'Draft cleared', detail: 'Your draft was cleared when you signed out.' });
      } catch (e) {}
    } catch (e) {
      console.warn('Error clearing stored conversation on sign-out:', e.message || e);
    }
  }
  prevUserId = newUid;
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  try {
    if (bc) {
      bc.close();
      bc = null;
    }
  } catch (e) {}
  window.removeEventListener('storage', handleStorageEvent);
  if (saveTimeout) clearTimeout(saveTimeout);
});
</script>
