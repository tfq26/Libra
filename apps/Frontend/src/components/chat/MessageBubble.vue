<template>
  <div class="w-full flex" :class="alignmentClass">
    <div :class="['flex max-w-[90%] sm:max-w-[80%] flex-col gap-2', bubbleColumnClass]">
      <Message 
        :severity="messageSeverity"
        :closable="false"
        :class="messageClasses"
        fluid
      >
        <template #messageicon>
          <i :class="messageIconClass" class="text-lg"></i>
        </template>

        <div class="flex flex-col gap-3 w-full">
          <!-- Message text content -->
          <div
            v-if="hasText"
            class="markdown-content prose-sm max-w-none"
            v-html="truncatedContent"
          ></div>

          <!-- Inline typing dots while assistant message is being composed -->
          <div v-else-if="isAssistantMessage" class="flex items-center space-x-1.5">
            <div class="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.3s] opacity-60"></div>
            <div class="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.15s] opacity-60"></div>
            <div class="w-2 h-2 bg-current rounded-full animate-pulse opacity-60"></div>
          </div>

          <!-- Read More Button -->
          <Button
            v-if="hasText && isTruncated"
            label="Read More"
            icon="pi pi-window-maximize"
            @click="$emit('show-full-message', message.content)"
            text
            size="small"
            class="mt-2 font-semibold self-start"
          />

          <!-- Attachments -->
          <div v-if="attachments.length" class="mt-2 space-y-3">
            <div class="text-[0.65rem] font-semibold tracking-[0.35em] uppercase opacity-80">
              Attachments
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <a
                v-for="attachment in attachments"
                :key="attachment.id || attachment.blobName || attachment.previewUrl || attachment.signedUrl"
                :href="resolveAttachmentUrl(attachment) || undefined"
                :target="resolveAttachmentUrl(attachment) ? '_blank' : undefined"
                :rel="resolveAttachmentUrl(attachment) ? 'noopener noreferrer' : undefined"
                :class="[
                  'group relative aspect-[4/3] overflow-hidden rounded-xl border transition-all',
                  'hover:shadow-lg hover:scale-[1.02]',
                  attachment.status === 'uploading' ? 'pointer-events-none opacity-70' : '',
                  isUserMessage ? 'border-primary/30 bg-primary-50/40' : 'border-amber-300/30 bg-amber-50/40'
                ]"
              >
                <img
                  v-if="resolveAttachmentUrl(attachment)"
                  :src="resolveAttachmentUrl(attachment)"
                  :alt="attachment.fileName || 'Attachment'"
                  class="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-105"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center bg-surface-100 text-xs font-medium text-muted-color"
                >
                  Preview unavailable
                </div>

                <!-- Upload/Error Status Overlay -->
                <div
                  v-if="attachment.status === 'uploading' || attachment.status === 'error'"
                  class="absolute inset-0 flex flex-col items-center justify-center bg-surface-900/80 text-xs font-semibold uppercase tracking-widest text-surface-0"
                >
                  <span>{{ attachment.status === 'uploading' ? 'Uploading…' : 'Failed' }}</span>
                  <span v-if="attachment.status === 'error'" class="mt-1 text-[0.6rem] font-normal opacity-80">
                    Tap to retry
                  </span>
                </div>

                <!-- Hover Info Overlay -->
                <div
                  v-else-if="resolveAttachmentUrl(attachment)"
                  class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-surface-900/90 via-surface-900/40 to-transparent px-3 py-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-surface-0 opacity-0 transition group-hover:opacity-100"
                >
                  <span class="truncate pr-3">{{ attachment.fileName || 'Image' }}</span>
                  <span class="flex items-center gap-1">
                    <i class="pi pi-external-link text-xs"></i> View
                  </span>
                </div>
              </a>
            </div>
          </div>

          <!-- Timestamp -->
          <div v-if="timestampLabel" class="text-[0.6rem] uppercase tracking-[0.25em] opacity-60 mt-1">
            {{ timestampLabel }}
          </div>
        </div>
      </Message>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import Message from 'primevue/message';
import Button from 'primevue/button';

const md = new MarkdownIt({ html: false, linkify: true });

const props = defineProps({
  message: { type: Object, required: true }
});

defineEmits(['show-full-message']);

const CHARACTER_LIMIT = 400;

const isUserMessage = computed(() => props.message?.role === 'user');
const isAssistantMessage = computed(() => props.message?.role === 'assistant');

// Severity mapping for PrimeVue Message component
const messageSeverity = computed(() => {
  if (isUserMessage.value) return 'info';
  if (isAssistantMessage.value) return 'warn';
  return 'secondary';
});

// Icon for message type
const messageIconClass = computed(() => {
  if (isUserMessage.value) return 'pi pi-user';
  if (isAssistantMessage.value) return 'pi pi-sparkles';
  return 'pi pi-info-circle';
});

const textContent = computed(() => {
  const content = props.message?.content;
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content.text === 'string') return content.text;
  return '';
});

const hasText = computed(() => textContent.value.trim().length > 0);

const isTruncated = computed(() => textContent.value.length > CHARACTER_LIMIT);

const truncatedContent = computed(() => {
  const text = textContent.value;
  if (!text) return '';
  if (text.length > CHARACTER_LIMIT) {
    const lastSpace = text.lastIndexOf(' ', CHARACTER_LIMIT);
    const cutIndex = lastSpace > 0 ? lastSpace : CHARACTER_LIMIT;
    const shortContent = text.substring(0, cutIndex) + '...';
    return md.render(shortContent);
  }
  return md.render(text);
});

const attachments = computed(() => {
  const content = props.message?.content;
  if (content && Array.isArray(content.attachments)) {
    return content.attachments;
  }
  return [];
});

function resolveAttachmentUrl(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  return attachment.signedUrl || attachment.previewUrl || attachment.url || attachment.tempUrl || null;
}

const alignmentClass = computed(() => (isUserMessage.value ? 'justify-end' : 'justify-start'));

const bubbleColumnClass = computed(() => (isUserMessage.value ? 'items-end' : 'items-start'));

// Custom styling for the Message component
const messageClasses = computed(() => {
  const base = 'shadow-sm backdrop-blur-sm';
  return base;
});

const timestampLabel = computed(() => {
  const rawTs = props.message?.timestamp || props.message?.updatedAt || props.message?.createdAt;
  if (!rawTs) return '';
  const date = new Date(rawTs);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  } catch (err) {
    return '';
  }
});
</script>