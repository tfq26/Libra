<template>
  <!-- 👇 Added h-full for layout stability -->
  <div class="flex flex-col h-full">

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
      <Dialog 
        header="Full Message" 
        v-model:visible="isDialogVisible" 
        modal 
        :style="{ width: '80vw', maxWidth: '600px'}"
      >
        <div 
          class="prose dark:prose-invert max-h-[60vh] overflow-y-auto" 
          v-html="fullMessageContent"
        >
        </div>
        <template #footer>
          <Button label="Close" icon="pi pi-times" @click="isDialogVisible = false" class="p-button-text"></Button>
        </template>
      </Dialog>
    </main>

    <footer class="p-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
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
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
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

const route = useRoute();
const router = useRouter();

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

function startNewChat() {
  messages.value = [];
  chatTitle.value = 'New Chat';
  currentConversationId.value = null;
  inputMode.value = 'text';
  actionOptions.value = [];
  currentPrompt.value = '';
  errorMessage.value = null;
}

watch(
  () => [route.params.id, isSignedIn.value],
  ([newId, signedIn]) => {
    if (!authStore.loading && signedIn) {
      if (newId) {
        loadChatHistory(newId);
      } else {
        startNewChat();
      }
    } else if (!authStore.loading && !signedIn) {
      router.push('/sign-in');
    }
  },
  { immediate: true, deep: true }
);

onBeforeUnmount(async () => {
  if (currentConversationId.value && messages.value.length > 0) {
    await saveConversation(
      currentConversationId.value,
      messages.value,
      chatTitle.value,
      userId.value
    );
  }
});
</script>
