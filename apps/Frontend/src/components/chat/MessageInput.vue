<template>
  <div class="w-full flex flex-col gap-2">
    <div v-if="attachments.length" class="flex flex-wrap gap-2">
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

    <div class="w-full flex items-end gap-2 p-2 rounded-2xl shadow-sm">
      <Button
        icon="pi pi-paperclip"
        class="p-button-rounded p-button-primary flex-shrink-0"
        :disabled="isLoading || attachments.length >= maxAttachments"
        @click="openFileDialog"
      />

      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        accept="image/*"
        multiple
        @change="handleFileChange"
      />

      <Textarea
        ref="textAreaRef"
        v-model="internalValue"
        :placeholder="placeholder"
        :disabled="isLoading"
        autoResize
        rows="1"
        @keydown.enter.prevent="handleKeydown"
        @focus="handleFocus"
        class="w-full flex-grow border-none focus:ring-0 resize-none max-h-40 py-2 px-1 bg-transparent"
      />

      <Button
        icon="pi pi-send"
        :loading="isLoading"
        :disabled="!canSend"
        @click="handleSend"
        class="p-button-rounded p-button-primary flex-shrink-0"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineExpose, computed } from 'vue';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

const props = defineProps({
  modelValue: { type: String, required: true },
  isLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Type your message...' },
  attachments: { type: Array, default: () => [] },
  maxAttachments: { type: Number, default: 3 },
});

const emit = defineEmits(['update:modelValue', 'send', 'add-attachments', 'remove-attachment']);
const internalValue = ref(props.modelValue);
const textAreaRef = ref(null);
const fileInputRef = ref(null);

const attachments = computed(() => (Array.isArray(props.attachments) ? props.attachments : []));

const canSend = computed(() => {
  const hasText = internalValue.value && internalValue.value.trim().length > 0;
  const hasAttachments = attachments.value.length > 0;
  return !props.isLoading && (hasText || hasAttachments);
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

function focusInput() {
  const textarea = textAreaRef.value?.$el?.querySelector('textarea');
  if (textarea) textarea.focus();
}

function handleFocus(event) {
  setTimeout(() => {
    event.target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

defineExpose({
  focusInput,
});
</script>

<style scoped>

</style>