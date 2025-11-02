
<template>
  <div class="w-full flex flex-col gap-2">
    <!-- Attachments Preview -->
    <div v-if="attachments.length" class="flex flex-wrap gap-2 px-2">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="group relative w-20 h-20 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800"
      >
        <img
          v-if="resolveAttachmentUrl(attachment)"
          :src="resolveAttachmentUrl(attachment)"
          :alt="attachment.name || 'Attachment preview'"
          class="w-full h-full object-cover"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center px-2 text-center text-xs text-gray-600 dark:text-gray-300"
        >
          Preview unavailable
        </div>

        <button
          type="button"
          class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          @click="removeAttachment(attachment.id)"
        >
          <i class="pi pi-times text-xs"></i>
        </button>

        <div
          v-if="attachment.status === 'uploading'"
          class="absolute inset-0 bg-black/40 flex items-center justify-center text-xs text-white"
        >
          Uploading…
        </div>
        <div
          v-else-if="attachment.status === 'error'"
          class="absolute inset-0 bg-black/40 flex items-center justify-center text-xs text-white"
        >
          Failed
        </div>
      </div>
    </div>

    <!-- Main Input Toolbar -->
    <Toolbar style="border: none;">
      <template #start>
        <!-- Desktop: Show all controls -->
        <div v-if="!isMobile" class="flex items-center gap-2">
          <Button
            icon="pi pi-paperclip"
            class="p-button-rounded p-button-text"
            :disabled="isLoading || attachments.length >= maxAttachments"
            @click="openFileDialog"
            v-tooltip.top="'Attach image'"
            aria-label="Attach image"
          />
          <Button
            v-if="canRestart"
            icon="pi pi-refresh"
            class="p-button-rounded p-button-text"
            :disabled="isLoading"
            @click="$emit('restart')"
            v-tooltip.top="'Restart conversation'"
            aria-label="Restart conversation"
          />
          <Button
            v-if="showTextModeToggle"
            icon="pi pi-keyboard"
            class="p-button-rounded p-button-text"
            :disabled="isLoading"
            @click="$emit('switch-to-text')"
            v-tooltip.top="'Switch to text input'"
            aria-label="Switch to text input"
          />
        </div>

        <!-- Mobile: Show popover when typing -->
        <div v-else class="flex items-center gap-2">
          <Button
            v-if="isTyping"
            icon="pi pi-ellipsis-v"
            class="p-button-rounded p-button-text"
            @click="toggleMobileMenu"
            aria-label="More options"
          />
          <Button
            v-else
            icon="pi pi-paperclip"
            class="p-button-rounded p-button-text"
            :disabled="isLoading || attachments.length >= maxAttachments"
            @click="openFileDialog"
            aria-label="Attach image"
          />
        </div>
      </template>

      <template #center>
        <!-- Text Input Area -->
        <Textarea
          v-if="showTextInput"
          ref="textAreaRef"
          v-model="internalValue"
          :placeholder="placeholder"
          :disabled="isLoading"
          autoResize
          rows="1"
          @keydown.enter.prevent="handleKeydown"
          @focus="handleTextFocus"
          @blur="handleTextBlur"
          class="focus:ring-0 resize-none max-h-40 bg-transparent"
          style="min-width: 700px; background: none; border: none; color: #ef9700;"
        />

        <!-- Action Buttons (when visible) -->
        <div v-else-if="showActionButtons" class="w-full flex flex-wrap gap-2 justify-center py-2">
          <Button
            v-for="option in actionOptions"
            :key="option"
            :label="option"
            class="p-button-sm"
            :class="isOtherOption(option) ? 'p-button-outlined' : 'p-button-primary'"
            @click="handleActionClick(option)"
            :disabled="isLoading"
          />
        </div>

        <!-- Empty state message -->
        <div v-else class="text-center text-gray-500 dark:text-gray-400 text-sm py-2">
          {{ emptyStateMessage }}
        </div>
      </template>

      <template #end>
        <Button
          icon="pi pi-send"
          :loading="isLoading"
          :disabled="!canSend"
          @click="handleSend"
          class="p-button-rounded p-button-primary"
          v-tooltip.top="'Send message'"
          aria-label="Send message"
        />
      </template>
    </Toolbar>

    <!-- Mobile Menu Popover -->
    <OverlayPanel ref="mobileMenuRef" class="mobile-options-menu">
      <div class="flex flex-col gap-2 p-2 min-w-[200px]">
        <Button
          icon="pi pi-paperclip"
          label="Attach Image"
          class="p-button-text justify-start"
          :disabled="isLoading || attachments.length >= maxAttachments"
          @click="handleMobileAction('attach')"
        />
        <Button
          v-if="canRestart"
          icon="pi pi-refresh"
          label="Restart Chat"
          class="p-button-text justify-start"
          :disabled="isLoading"
          @click="handleMobileAction('restart')"
        />
        <Button
          v-if="showTextModeToggle"
          icon="pi pi-keyboard"
          label="Switch to Text"
          class="p-button-text justify-start"
          :disabled="isLoading"
          @click="handleMobileAction('switch-to-text')"
        />
      </div>
    </OverlayPanel>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/*"
      multiple
      @change="handleFileChange"
    />
  </div>
</template>

<script setup>
import { ref, watch, defineExpose, computed, onMounted, onUnmounted } from 'vue';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import OverlayPanel from 'primevue/overlaypanel';
import Tooltip from 'primevue/tooltip';

const props = defineProps({
  modelValue: { type: String, required: true },
  isLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Type your message...' },
  attachments: { type: Array, default: () => [] },
  maxAttachments: { type: Number, default: 3 },
  // Action buttons props
  actionOptions: { type: Array, default: () => [] },
  showTextInput: { type: Boolean, default: true },
  showActionButtons: { type: Boolean, default: false },
  // Control props
  canRestart: { type: Boolean, default: false },
  showTextModeToggle: { type: Boolean, default: false },
  emptyStateMessage: { type: String, default: 'Start typing...' }
});

const emit = defineEmits([
  'update:modelValue',
  'send',
  'add-attachments',
  'remove-attachment',
  'action-click',
  'restart',
  'switch-to-text'
]);

const internalValue = ref(props.modelValue);
const textAreaRef = ref(null);
const fileInputRef = ref(null);
const mobileMenuRef = ref(null);
const isMobile = ref(false);
const isTyping = ref(false);

const attachments = computed(() => (Array.isArray(props.attachments) ? props.attachments : []));

const canSend = computed(() => {
  if (props.isLoading) return false;
  
  // If showing action buttons, disable text send
  if (props.showActionButtons) return false;
  
  // Check for text or attachments
  const hasText = internalValue.value && internalValue.value.trim().length > 0;
  const hasAttachments = attachments.value.length > 0;
  
  return hasText || hasAttachments;
});

// Check if screen is mobile
function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

watch(() => props.modelValue, val => (internalValue.value = val));
watch(internalValue, val => emit('update:modelValue', val));

function handleSend() {
  if (!canSend.value) return;
  emit('send');
  internalValue.value = '';
  emit('update:modelValue', '');
}

function handleKeydown(event) {
  if (event.shiftKey) return;
  event.preventDefault();
  handleSend();
}

function openFileDialog() {
  if (props.isLoading) return;
  fileInputRef.value?.click();
}

function handleFileChange(event) {
  const files = event?.target?.files ? Array.from(event.target.files) : [];
  if (files.length) {
    emit('add-attachments', files);
  }
  if (event?.target) {
    event.target.value = '';
  }
}

function removeAttachment(attachmentId) {
  emit('remove-attachment', attachmentId);
}

function resolveAttachmentUrl(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  return attachment.previewUrl || attachment.signedUrl || attachment.url || attachment.tempUrl || null;
}

function handleActionClick(option) {
  emit('action-click', option);
}

function isOtherOption(option) {
  if (!option) return false;
  const normalized = option.toLowerCase().trim();
  return normalized === 'other' || 
         normalized === 'something else' || 
         normalized === 'custom' ||
         normalized === 'none of the above' ||
         normalized.includes('other');
}

function handleTextFocus() {
  isTyping.value = true;
}

function handleTextBlur() {
  // Delay to allow button clicks
  setTimeout(() => {
    if (!internalValue.value || internalValue.value.trim().length === 0) {
      isTyping.value = false;
    }
  }, 200);
}

function toggleMobileMenu(event) {
  mobileMenuRef.value?.toggle(event);
}

function handleMobileAction(action) {
  mobileMenuRef.value?.hide();
  
  switch (action) {
    case 'attach':
      openFileDialog();
      break;
    case 'restart':
      emit('restart');
      break;
    case 'switch-to-text':
      emit('switch-to-text');
      break;
  }
}

function focusInput() {
  const textarea = textAreaRef.value?.$el?.querySelector('textarea');
  if (textarea) textarea.focus();
}

defineExpose({
  focusInput,
});

const vTooltip = Tooltip;
</script>

<style scoped>
:deep(.p-toolbar) {
  background: var(--surface-card);
  padding: 0.5rem;
  gap: 0.5rem;
}

:deep(.p-toolbar-group-start),
:deep(.p-toolbar-group-center),
:deep(.p-toolbar-group-end) {
  display: flex;
  align-items: center;
}

:deep(.p-toolbar-group-center) {
  flex: 1;
  overflow: hidden;
}

:deep(.p-toolbar .p-button-rounded) {
  width: 2.5rem;
  height: 2.5rem;
}

/* Ensure textarea takes full width in center slot */
:deep(.p-toolbar-group-center .p-textarea) {
  width: 100%;
}

/* Mobile menu styling */
.mobile-options-menu :deep(.p-overlaypanel-content) {
  padding: 0;
}

.mobile-options-menu :deep(.p-button-text) {
  width: 100%;
  text-align: left;
}
</style>
