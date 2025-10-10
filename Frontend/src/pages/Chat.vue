<template>
  <div class="flex flex-col min-h-[calc(100vh-5rem)]"> 
    <header class="p-2 md:p-2 border-b border-black dark:border-sunset-800 flex-shrink-0">
      <h1 class="text-xl md:text-5xl font-bold text-gray-800 dark:text-sunset-400 truncate
       flex items-center gap-6">
        {{ chatTitle || 'New Chat' }}
        <i v-if="isLoadingChat" class="pi pi-spin pi-spinner text-lg text-gray-600 dark:text-sunset-300"></i>
      </h1>
    </header>

    <Transition name="fade">
      <div v-if="errorMessage" class="px-2 md:px-6 my-2">
        <Message severity="error" :closable="true" @close="errorMessage = null">
          {{ errorMessage }}
        </Message>
      </div>
    </Transition>

    <main class="flex-grow flex flex-col overflow-hidden">
      <div class="h-0 flex-grow px-2 md:px-6 py-2 overflow-y-auto">
        <MessageList
          ref="messageListComp"
          :messages="filteredMessages"
          :is-loading="isLoadingChat"
        />
      </div>

      <footer class="px-6 flex-shrink-0 border-t border-black dark:border-sunset-800">
        <div class="flex flex-col md:flex-row items-center gap-3">

          <div v-if="inputMode === 'buttons' && actionOptions.length && !isLoadingChat" 
               class="flex w-full justify-between items-end">
            
            <!-- Action Buttons Group (Grouped for flex-wrap) -->
            <div class="flex flex-wrap gap-2">
              <ActionButtons 
                :options="actionOptions"
                class="w-full md:w-auto"
                @response="handleButtonResponse"
              />
            </div>
            
            <!-- Type Instead Button (Pushed to the far right) -->
            <button
              @click="handleSwitchToTextMode"
              class="flex items-center justify-end space-x-2 
                    py-2 px-4 rounded-lg 
                    font-semibold text-sm md:text-base 
                    transition-all duration-200 ease-in-out
                    bg-transparent text-gray-400 border border-sunset-600 
                    hover:bg-sunset-300/40 hover:text-sunset-600 hover:border-sunset-600
                    h-10 md:h-12 cursor-pointer flex-shrink-0"
            >
              <i class="pi pi-keyboard text-lg"></i>
              <span>Type Instead</span>
            </button>
          </div>

          <div v-else class="flex w-full items-end gap-2 mb-6">
            <MessageInput
              ref="messageInputComp"
              v-model="currentPrompt"
              :is-loading="isLoadingChat"
              @send="handleTextInputSend"
              placeholder="Type your message..."
            />
          </div>

        </div>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { sendChatMessage, loadConversation } from '../functions/conversation-api';
import MessageList from '../components/chat/MessageList.vue';
import ActionButtons from '../components/chat/ActionButtons.vue';
import MessageInput from '../components/chat/MessageInput.vue';

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
  // CRITICAL: Immediately clear action options so the v-if condition fails
  actionOptions.value = []; 
}

async function handleButtonResponse(text) {
  if (!isSignedIn.value || isLoadingChat.value) return;
  // Set to text mode immediately before sending
  inputMode.value = 'text';
  actionOptions.value = [];
  messages.value.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
  await scrollToBottom();
  await sendMessage(text);
}

async function handleTextInputSend() {
  if (!isSignedIn.value || isLoadingChat.value) return;
  const msg = currentPrompt.value.trim();
  console.log('[USER TEXT] Sending message:', msg);
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

    console.log('[AI RESPONSE] Received message content:', data.response);
    console.log('[AI RESPONSE] Options received:', data.options);
    console.log('[AI RESPONSE] Conversation ID:', data.conversationId);
    
    messages.value.push({ role: 'assistant', content: data.response, timestamp: new Date().toISOString() });
    actionOptions.value = data.options || [];
    inputMode.value = actionOptions.value.length ? 'buttons' : 'text';
    if (data.conversationId && !currentConversationId.value) {
      currentConversationId.value = data.conversationId;
      // Use router.replace to update the URL without adding a new history entry
      router.replace({ params: { id: data.conversationId } });
    }
  } catch (err) {
    errorMessage.value = err.message || 'Message failed to send.';
  } finally {
    isLoadingChat.value = false;
    scrollToBottom();
  }
}

// --- New/Updated Watcher for Input Focus ---
watch(() => route.params.id, (newId) => {
  if (newId && isSignedIn.value && userId.value) loadChatHistory(newId);
  else { /* new chat logic */ }
}, { immediate: true });

watch([isLoaded, isSignedIn, userId], ([loaded, signedIn, uid]) => {
  if (loaded && signedIn && uid && route.params.id) loadChatHistory(route.params.id);
});

// NEW: Focus the input when the mode switches to 'text'
watch(inputMode, async (newMode) => {
  if (newMode === 'text') {
    await nextTick();
    // Assuming MessageInput exposes a focus method or has a well-defined input element
    if (messageInputComp.value?.focusInput) {
      messageInputComp.value.focusInput();
    }
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