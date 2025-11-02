<template>
  <div class="flex flex-col h-full px-2">

    <header class="p-4 sm:p-6 border-b border-sunset-500 dark:border-gray-700 flex-shrink-0">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">
          {{ chatTitle || 'New Chat' }}
        </h1>
      </div>
    </header>
    
    <main ref="mainContainer" class="flex-grow overflow-y-auto relative">
      <!-- Loading overlay for chat history -->
      <div 
        v-if="isLoadingHistory"
        class="absolute inset-0 z-50 flex items-center justify-center bg-surface-0/90 dark:bg-surface-900/90 backdrop-blur-md"
      >
        <Card class="shadow-xl">
          <template #content>
            <div class="flex justify-center p-4">
              <ProgressSpinner 
                style="width: 60px; height: 60px"
                strokeWidth="4"
                animationDuration="1s"
              />
            </div>
          </template>
        </Card>
      </div>

      <MessageList
        ref="messageListComp" :messages="filteredMessages"
        :is-loading="isTypingIndicatorVisible"
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

    <ConfirmDialog></ConfirmDialog>

    <footer class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-2">
      <!-- Conversation Complete State: show completion actions -->
      <div
        v-if="isConversationComplete"
        class="px-3 py-3 sm:px-4 sm:py-4 space-y-3"
      >
        <div class="text-center text-sm text-gray-600 dark:text-gray-300 mb-2">
          This conversation has been completed.
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <Button
            label="Exit to Home"
            icon="pi pi-home"
            @click="handleExitToHome"
            class="p-button-success"
          />
          <Button
            label="Continue Conversation"
            icon="pi pi-comments"
            @click="handleContinueConversation"
            class="p-button-secondary"
          />
        </div>
      </div>

      <!-- Unified Chat Input Toolbar -->
      <div v-else class="w-full">
        <ChatInputToolbar
          ref="chatInputToolbarRef"
          v-model="currentPrompt"
          :is-loading="isLoadingChat"
          :attachments="pendingAttachments"
          :max-attachments="MAX_ATTACHMENTS"
          :action-options="actionOptions"
          :show-text-input="inputMode === 'text'"
          :show-action-buttons="inputMode === 'buttons' && actionOptions.length > 0"
          :can-restart="messages.length > 0"
          :show-text-mode-toggle="inputMode === 'buttons' && actionOptions.length > 0"
          :empty-state-message="messages.length === 0 ? 'Start your conversation...' : 'Type your message...'"
          @send="handleTextInputSend"
          @add-attachments="handleAttachmentsAdded"
          @remove-attachment="handleAttachmentRemoved"
          @action-click="handleButtonResponse"
          @restart="confirmRestart"
          @switch-to-text="handleSwitchToTextMode"
          placeholder="Type your message..."
        />
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToast } from 'primevue/usetoast';
import { navigateToError } from '../router';

import { sendChatMessage, loadConversation, parseAIResponse, deleteConversation } from '../functions/conversation-api';
import { initConversation } from '../functions/conversation-api';
import { saveConversation } from '../functions/history-api'; 
import { useConversationStore } from '../stores/conversationStore'; // 👈 Add this import

import MessageList from '../components/chat/MessageList.vue';
import ChatInputToolbar from '../components/chat/ChatInputToolbar.vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import MarkdownIt from 'markdown-it';
import Toast from 'primevue/toast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';
import imageCompression from 'browser-image-compression';
import { contentToString } from '../utils/content.js';

const md = new MarkdownIt({ html: false, linkify: true });

const authStore = useAuthStore();
const confirm = useConfirm();
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
const mainContainer = ref(null);
const chatInputToolbarRef = ref(null);
const isLoadingChat = ref(false);
const isLoadingHistory = ref(false);
const inputMode = ref('text');
const actionOptions = ref([]);
const currentConversationId = ref(null);
const hasUnsavedChanges = ref(false);
let saveTimeout = null;
const route = useRoute();
const router = useRouter();
const isInitialLoad = ref(true);
const filteredMessages = computed(() => messages.value.filter(m => m.role !== 'system'));
const isDialogVisible = ref(false);
const fullMessageContent = ref('');
const toastLocal = useToast();
const bypassUnsavedPrompt = ref(false);
const isStreamingAssistant = ref(false);
const pendingHistoryLoadId = ref(null);
const isRestarting = ref(false);
const isConversationComplete = ref(false);
const clientInstanceId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const MAX_ATTACHMENTS = 3;
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_MB = MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024);
const IMAGE_COMPRESSION_TARGET_MB = Math.max(0.4, Math.min(2, MAX_UPLOAD_MB * 0.9));
const IMAGE_COMPRESSION_MAX_DIMENSION = 1600;
const COMPRESSIBLE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']);
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const pendingAttachments = ref([]);
const attachmentAccepts = ALLOWED_IMAGE_TYPES.join(',');

// Show typing dots only when loading and there isn't an assistant message already streaming
const hasAssistantStreamingMessage = computed(() => {
  const last = messages.value[messages.value.length - 1];
  if (!last || last.role !== 'assistant') return false;
  const text = contentToString(last.content || '').trim();
  return text.length === 0; // assistant bubble exists but no content yet
});
const isTypingIndicatorVisible = computed(() => isLoadingChat.value && !hasAssistantStreamingMessage.value);

function generateLocalId(prefix = 'att') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createAttachmentObject(file) {
  return {
    id: generateLocalId(),
    file,
    name: file.name || 'image',
    size: file.size,
    type: (file.type || '').toLowerCase(),
    previewUrl: URL.createObjectURL(file),
    status: 'ready',
  };
}

function revokeAttachmentPreview(attachment) {
  try {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  } catch (e) {
    // swallow; revocation is best-effort
  }
}

function deriveExtensionFromMime(mime) {
  if (!mime) return null;
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };
  return map[mime.toLowerCase()] || null;
}

function normalizeFileNameForMime(name, mime) {
  const desiredExt = deriveExtensionFromMime(mime);
  if (!desiredExt) return name || 'image';
  const baseName = () => {
    if (!name) return 'image';
    const lastDot = name.lastIndexOf('.');
    if (lastDot <= 0) return name;
    return name.slice(0, lastDot);
  };
  const base = baseName();
  const currentExt = name && name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  if (currentExt === desiredExt) return name;
  return `${base}${desiredExt}`;
}

async function compressImageIfNeeded(file) {
  const mime = (file.type || '').toLowerCase();
  if (!mime || mime === 'image/gif' || !COMPRESSIBLE_MIME_TYPES.has(mime)) {
    return file;
  }

  try {
    const options = {
      maxSizeMB: IMAGE_COMPRESSION_TARGET_MB,
      maxWidthOrHeight: IMAGE_COMPRESSION_MAX_DIMENSION,
      useWebWorker: true,
      maxIteration: 15,
      initialQuality: 0.75,
    };

    // Convert HEIC/HEIF to WebP for broader compatibility
    let targetType = mime;
    if (mime === 'image/heic' || mime === 'image/heif') {
      options.fileType = 'image/webp';
      targetType = 'image/webp';
    }

    const compressed = await imageCompression(file, options);
    
    // Determine the final MIME type (compression library may change it)
    const finalType = compressed.type || targetType || file.type || 'image/webp';
    
    // Always create a new File to ensure type is preserved
    const fileName = normalizeFileNameForMime(file.name, finalType);
    
    if (compressed.size >= file.size) {
      // Keep original if compression didn't help
      return file;
    }

    return new File([compressed], fileName, { type: finalType, lastModified: Date.now() });
  } catch (err) {
    console.warn('Image compression failed:', err?.message || err);
    return file;
  }
}

async function handleAttachmentsAdded(files) {
  if (!files) return;
  const fileList = Array.isArray(files) ? files : Array.from(files);
  if (!fileList.length) return;

  const availableSlots = Math.max(0, MAX_ATTACHMENTS - pendingAttachments.value.length);
  if (availableSlots <= 0) {
    toast.add({
      severity: 'warn',
      summary: 'Attachment limit reached',
      detail: `You can upload up to ${MAX_ATTACHMENTS} images per message.`,
      life: 4000,
    });
    return;
  }

  const filesToProcess = fileList.slice(0, availableSlots);
  if (fileList.length > availableSlots) {
    toast.add({
      severity: 'info',
      summary: 'Some files skipped',
      detail: `Only the first ${availableSlots} file(s) were added due to the attachment limit.`,
      life: 3500,
    });
  }

  const compressionResults = await Promise.allSettled(filesToProcess.map(async (file) => {
    if (!(file instanceof File)) {
      throw new Error('Invalid file received.');
    }

    const mime = (file.type || '').toLowerCase();
    if (mime && !ALLOWED_IMAGE_TYPES.includes(mime)) {
      throw Object.assign(new Error('Unsupported file type'), {
        toast: {
          severity: 'error',
          summary: 'Unsupported file type',
          detail: `${file.name || 'This file'} is not a supported image type.`
        }
      });
    }

    const processedFile = await compressImageIfNeeded(file);

    if (!processedFile.type) {
      throw Object.assign(new Error('Processed file missing type'), {
        toast: {
          severity: 'error',
          summary: 'Processing error',
          detail: `Failed to process ${file.name || 'file'}. Please try again.`
        }
      });
    }

    if (processedFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      const maxMb = (MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)).toFixed(1);
      throw Object.assign(new Error('File too large'), {
        toast: {
          severity: 'error',
          summary: 'File too large',
          detail: `${file.name || 'This file'} exceeds the ${maxMb} MB limit even after compression.`
        }
      });
    }

    return processedFile;
  }));

  compressionResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value instanceof File) {
      pendingAttachments.value.push(createAttachmentObject(result.value));
    } else {
      const reason = result.status === 'rejected' ? result.reason : null;
      const toastConfig = reason?.toast;
      if (toastConfig) {
        toast.add({ severity: toastConfig.severity || 'error', summary: toastConfig.summary || 'Attachment error', detail: toastConfig.detail, life: 5000 });
      } else if (reason?.message) {
        toast.add({ severity: 'error', summary: 'Attachment error', detail: reason.message, life: 5000 });
      }
    }
  });
}

function handleAttachmentRemoved(attachmentId) {
  const index = pendingAttachments.value.findIndex(att => att.id === attachmentId);
  if (index >= 0) {
    const [removed] = pendingAttachments.value.splice(index, 1);
    revokeAttachmentPreview(removed);
  }
}

function resetPendingAttachments({ revokePreviews = false } = {}) {
  if (revokePreviews) {
    for (const attachment of pendingAttachments.value) {
      revokeAttachmentPreview(attachment);
    }
  }
  pendingAttachments.value = [];
}

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
      bc.postMessage({ userId, conversationId: convoId, senderId: clientInstanceId });
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
    const { userId: msgUser, conversationId: msgConvo, senderId } = msg;
    if (senderId && senderId === clientInstanceId) return;
    if (!msgUser || msgUser !== userId.value) return;
    if (msgConvo && msgConvo !== currentConversationId.value) {
      if (isAutoRestoreEnabled()) {
        currentConversationId.value = msgConvo;
        router.replace({ params: { id: msgConvo } });
        // Load the conversation into the UI
        if (isStreamingAssistant.value) {
          pendingHistoryLoadId.value = msgConvo;
        } else {
          loadChatHistory(msgConvo).catch(() => {});
        }
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
      if (isStreamingAssistant.value) {
        pendingHistoryLoadId.value = newVal;
      } else {
        loadChatHistory(newVal).catch(() => {});
      }
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

/**
 * Scroll to bottom of the message list
 */
function scrollToBottom() {
  nextTick(() => {
    setTimeout(() => {
      // Scroll the main container which has the overflow
      const container = mainContainer.value;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  });
}

/**
 * Loads the full message history for a single conversation, using the Pinia store for caching.
 * It will first check the local cache before making an API call.
 * @param {string} id The ID of the conversation to load.
 */
async function loadChatHistory(id) {
  if (!isSignedIn.value || !userId.value) return;
  isLoadingChat.value = true;
  isLoadingHistory.value = true;

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

    // Check if conversation is marked complete from saved state
    if (conversation.status === 'resolved') {
      isConversationComplete.value = true;
      inputMode.value = 'text';
      actionOptions.value = [];
    }

    // Scroll to bottom after messages and options are loaded
    scrollToBottom();

  } catch (err) {
    toast.add({ 
      severity: 'error', 
      summary: 'Load Error', 
      detail: err.message || 'Failed to load chat.', 
      life: 5000 
    });
  } finally {
    isLoadingChat.value = false;
    isLoadingHistory.value = false;
  }
}

function handleSwitchToTextMode() {
  inputMode.value = 'text';
  actionOptions.value = [];
  // Focus the input field after switching
  nextTick(() => {
    try { chatInputToolbarRef.value?.focusInput?.(); } catch (_) {}
  });
}

// When in buttons mode, if the user starts typing anywhere, switch to text mode and seed the first character
function isCharacterKey(e) {
  if (!e || typeof e.key !== 'string') return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  // Single visible character (letters, numbers, punctuation, space)
  return e.key.length === 1 && !/\p{C}/u.test(e.key);
}

function shouldIgnoreTarget(target) {
  if (!target || !target.tagName) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

async function handleGlobalKeydown(e) {
  if (inputMode.value !== 'buttons') return;
  if (!isSignedIn.value || isLoadingChat.value) return;
  if (shouldIgnoreTarget(e.target)) return;

  // Open type mode on any printable key, Backspace, or Enter
  let seed = '';
  if (isCharacterKey(e)) {
    seed = e.key;
  } else if (e.key === 'Backspace') {
    seed = '';
  } else if (e.key === 'Enter') {
    seed = '';
  } else {
    return; // ignore navigation and modifier keys
  }

  e.preventDefault();
  actionOptions.value = [];
  inputMode.value = 'text';
  // Seed the typed character so it doesn't get lost
  if (seed) currentPrompt.value = (currentPrompt.value || '') + seed;
  await nextTick();
  try { chatInputToolbarRef.value?.focusInput?.(); } catch (_) {}
}

async function handleButtonResponse(text) {
  if (!isSignedIn.value || isLoadingChat.value) return;
  inputMode.value = 'text';
  actionOptions.value = [];
  const userMessageId = `user-${Date.now()}`;
  // normalize content shape and mark that we've already pushed the message
  const messageContent = reactive({ text });
  const userMessage = reactive({
    id: userMessageId,
    role: 'user',
    content: messageContent,
    timestamp: new Date().toISOString(),
  });
  messages.value.push(userMessage);
  scrollToBottom();
  await sendMessage(text, true, userMessageId);
}

async function handleTextInputSend() {
  if (!isSignedIn.value || isLoadingChat.value) return;
  const msg = currentPrompt.value.trim();
  const hasAttachments = pendingAttachments.value.length > 0;
  if (!msg && !hasAttachments) return;

  let userMessageId = null;
  const alreadyPushed = !hasAttachments;

  if (alreadyPushed) {
    userMessageId = `user-${Date.now()}`;
    // push a normalized user message object then send; avoid duplication in sendMessage
    const userContent = reactive({ text: msg });
    const userMessage = reactive({
      id: userMessageId,
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString(),
    });
    messages.value.push(userMessage);
    scrollToBottom();
  }

  currentPrompt.value = '';
  await sendMessage(msg, alreadyPushed, userMessageId);
}

/**
 * Sends a user's message, handles the streaming response, and invalidates the local cache upon completion.
 * @param {string} userPrompt The text content from the user's input.
 */
async function sendMessage(userPrompt, alreadyPushed = false, existingUserMessageId = null) {
  if (isLoadingChat.value || !isSignedIn.value) return;

  const promptToSend = typeof userPrompt === 'string' ? userPrompt.trim() : '';
  const attachmentsToUpload = pendingAttachments.value.map(att => ({ ...att }));
  const hasAttachments = attachmentsToUpload.length > 0;

  if (!hasAttachments && !promptToSend) return;

  // If user continues a complete conversation, reopen it
  if (isConversationComplete.value) {
    isConversationComplete.value = false;
  }

  isLoadingChat.value = true;
  isStreamingAssistant.value = true;
  error.value = null;
  actionOptions.value = [];
  inputMode.value = 'text';

  let userMessageId = existingUserMessageId;
  let userMessageRef = null;

  if (!alreadyPushed) {
    userMessageId = `user-${Date.now()}`;
    const content = reactive({});
    if (promptToSend) content.text = promptToSend;
    if (hasAttachments) {
      content.attachments = attachmentsToUpload.map(att => reactive({
        id: att.id,
        type: 'image',
        mimeType: att.type,
        fileName: att.name,
        size: att.size,
        previewUrl: att.previewUrl,
        status: 'uploading',
      }));
    }
    userMessageRef = reactive({
      id: userMessageId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    });
    messages.value.push(userMessageRef);
  } else {
    userMessageRef = messages.value.find(m => m.id === userMessageId) || [...messages.value].reverse().find(m => m.role === 'user');
  }

  pendingAttachments.value = [];

  const assistantMessageId = `temp-assistant-${Date.now()}`;
  const assistantMessage = reactive({
    id: assistantMessageId,
    role: 'assistant',
    content: reactive({ text: '' }),
    timestamp: new Date().toISOString(),
  });
  messages.value.push(assistantMessage);

  currentPrompt.value = '';
  scrollToBottom();

  try {
    const token = await getAuthToken();
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    let response;

    if (hasAttachments) {
      const formData = new FormData();
      formData.append('userId', userId.value);
      if (currentConversationId.value) {
        formData.append('conversationId', currentConversationId.value);
      }
      formData.append('message', promptToSend || '');

      attachmentsToUpload.forEach((attachment, index) => {
        if (attachment.file instanceof File) {
          const fallbackName = attachment.name || `image-${index + 1}`;
          formData.append(`attachment_${index}`, attachment.file, fallbackName);
        }
      });

      response = await fetch('/api/conversation', {
        method: 'POST',
        headers,
        body: formData,
      });
    } else {
      headers.append('Content-Type', 'application/json');
      response = await fetch('/api/conversation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: promptToSend,
          conversationId: currentConversationId.value,
          userId: userId.value,
        }),
      });
    }

    const serverConversationId = response.headers.get('x-conversation-id');
    if (serverConversationId && serverConversationId !== currentConversationId.value) {
      currentConversationId.value = serverConversationId;
      broadcastConversationId(userId.value, serverConversationId);
      try {
        localStorage.setItem(storageKeyFor(userId.value), serverConversationId);
      } catch (storageErr) {
        console.warn('Failed to persist conversation id to storage:', storageErr?.message || storageErr);
      }
    }

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'The server returned an error.');
      throw new Error(errorText || 'The server returned an error.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAIResponse = '';

    let receivedAnyChunk = false;
    if (!assistantMessage.content.text) {
      assistantMessage.content.text = '';
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullAIResponse += chunk;
      receivedAnyChunk = true;

      assistantMessage.content.text += chunk;
      scrollToBottom();
    }
    if (!receivedAnyChunk) {
      assistantMessage.content.text = '[No response received from model]';
    }

    const finalParsed = parseAIResponse(fullAIResponse);
    const trimmedCleanMessage = finalParsed.cleanMessage ? finalParsed.cleanMessage.trim() : '';

    // Check if conversation is marked complete
    if (finalParsed.isDone) {
      isConversationComplete.value = true;
      inputMode.value = 'text'; // hide any action buttons
      actionOptions.value = [];
      // Invalidate cache immediately so next load gets fresh data from DB
      if (currentConversationId.value) {
        conversationStore.invalidateConversation(currentConversationId.value);
      }
    } else if (finalParsed.options && finalParsed.options.length > 0) {
      actionOptions.value = finalParsed.options;
      inputMode.value = 'buttons';

      const currentAssistantText = (assistantMessage.content?.text || '').trim();
      if (!trimmedCleanMessage && !currentAssistantText) {
        assistantMessage.content.text = 'Please choose an option below.';
      }

      // Scroll after options are rendered
      scrollToBottom();
    }

    if (trimmedCleanMessage && trimmedCleanMessage !== assistantMessage.content.text) {
      assistantMessage.content.text = trimmedCleanMessage;
    }

    if (userMessageRef?.content?.attachments?.length) {
      userMessageRef.content.attachments = userMessageRef.content.attachments.map(att => ({
        ...att,
        status: 'uploaded',
      }));
    }

  } catch (err) {
    error.value = err.message || String(err);
    if (assistantMessage) {
      assistantMessage.content.text = `Sorry, an error occurred: ${err.message || err}`;
    }
    if (userMessageRef?.content?.attachments?.length) {
      userMessageRef.content.attachments = userMessageRef.content.attachments.map(att => ({
        ...att,
        status: 'error',
      }));
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
    isLoadingChat.value = false;
    isStreamingAssistant.value = false;
    scrollToBottom();

    if (currentConversationId.value) {
      conversationStore.invalidateConversation(currentConversationId.value);
    }

    if (pendingHistoryLoadId.value) {
      const nextId = pendingHistoryLoadId.value;
      pendingHistoryLoadId.value = null;
      if (nextId) {
        loadChatHistory(nextId).catch(() => {});
      }
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
  isConversationComplete.value = false;
  resetPendingAttachments({ revokePreviews: true });
    // No auto-draft creation! Only create a conversation when the user sends a message.
}

function handleExitToHome() {
  // Invalidate cache to ensure fresh data on next load
  if (currentConversationId.value) {
    conversationStore.invalidateConversation(currentConversationId.value);
  }
  bypassUnsavedPrompt.value = true;
  router.push({ name: 'Home' });
}

function handleContinueConversation() {
  isConversationComplete.value = false;
  inputMode.value = 'text';
  nextTick(() => {
    try { chatInputToolbarRef.value?.focusInput?.(); } catch (_) {}
  });
}

async function confirmRestart() {
  if (!isSignedIn.value) return;
  confirm.require({
    message: 'Restart this chat? This will delete all messages in the current conversation.',
    header: 'Confirm Restart',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Yes, Restart',
    rejectLabel: 'Cancel',
    accept: () => {
      restartCurrentChat();
    }
  });
}

async function restartCurrentChat() {
  if (isRestarting.value) return;
  try {
    isRestarting.value = true;
    bypassUnsavedPrompt.value = true; // avoid prompts when navigating/clearing

    const convoId = currentConversationId.value;
    if (convoId) {
      try {
        await deleteConversation(userId.value, convoId);
        conversationStore.invalidateConversation(convoId);
      } catch (err) {
        // If backend says not found, proceed as restarted anyway
        console.warn('Delete conversation failed (continuing):', err?.message || err);
      }
      // Clear persisted id and notify other tabs
      try { localStorage.removeItem(storageKeyFor(userId.value)); } catch (_) {}
      try { broadcastConversationId(userId.value, null); } catch (_) {}
    }

    // Reset UI to a fresh chat
    startNewChat();
    // Navigate to /chat (no id)
    try { await router.replace({ name: 'Chat', params: {} }); } catch (_) {}

    toast.add({ severity: 'success', summary: 'Chat restarted', detail: 'The conversation was cleared.', life: 2500 });
  } finally {
    isRestarting.value = false;
    // allow prompts again after action completes
    setTimeout(() => { bypassUnsavedPrompt.value = false; }, 0);
  }
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
      if (isStreamingAssistant.value) {
        pendingHistoryLoadId.value = newId;
      } else {
        await loadChatHistory(newId);
      }
        } else {
            startNewChat();
        }
        return;
    }

    // 5. Handle navigation between chats
    if (signedIn && newId !== oldId) {
      if (newId) {
        if (isStreamingAssistant.value) {
          pendingHistoryLoadId.value = newId;
        } else {
          // Always reload the chat history when navigating to a chat (even if oldId is undefined)
          await loadChatHistory(newId);
        }
      } else {
        // Navigating to the "New Chat" page
        startNewChat();
      }
    }
        // If no conversation exists, create one now (async, before sending message)
        if (!currentConversationId.value) {
          const token = await getAuthToken();
          const data = await initConversation(token);
          if (data && data.conversationId) {
            currentConversationId.value = data.conversationId;
            broadcastConversationId(userId.value, data.conversationId);
            localStorage.setItem(storageKeyFor(userId.value), data.conversationId);
            if (isStreamingAssistant.value) {
              pendingHistoryLoadId.value = data.conversationId;
            }
            router.replace({ params: { id: data.conversationId } });
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
  resetPendingAttachments({ revokePreviews: true });
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
  // If the user starts typing while buttons are shown, switch to text input
  window.addEventListener('keydown', handleGlobalKeydown, { capture: true });
  // Initialize BroadcastChannel if supported
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('libra:conversation');
      bc.onmessage = handleIncomingBroadcast;
    }
  } catch (e) {
    console.warn('BroadcastChannel not available:', e.message || e);
  }

  // Run a quick system health check ONCE when chat page loads
  (async () => {
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
    confirm.require({
      message: 'You have unsaved changes in this conversation. Are you sure you want to leave?',
      header: 'Unsaved Changes',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Leave',
      rejectLabel: 'Stay',
      accept: () => {
        next();
      },
      reject: () => {
        next(false);
      }
    });
  } else {
    next();
  }
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
    resetPendingAttachments({ revokePreviews: true });
  }
  prevUserId = newUid;
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('keydown', handleGlobalKeydown, { capture: true });
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
