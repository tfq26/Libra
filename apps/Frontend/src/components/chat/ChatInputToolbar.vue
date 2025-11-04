<template>
  <div class="w-full">
    <!-- Action options row (appears above input) -->
    <div
      v-if="showActionButtons && actionOptions && actionOptions.length"
      class="mb-2 flex flex-wrap items-center gap-2 px-1"
    >
      <Button
        v-for="option in actionOptions"
        :key="option"
        :label="option"
        text
        class="p-button-sm !text-xs !px-2 !py-1 rounded-full"
        :disabled="isLoading"
        @click="handleActionClick(option)"
      />
    </div>
    <!-- Attachments bar -->
    <div
      v-if="attachments.length"
      class="mb-3 flex flex-wrap gap-2 rounded-2xl border bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md dark:bg-surface-900/80 dark:border-slate-700/60"
      role="region"
      aria-label="Attachment previews"
    >
      <div
        v-for="att in attachments"
        :key="att.id"
        class="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative"
      >
        <img :src="resolveAttachmentUrl(att)" class="object-cover w-full h-full" />
        <button
          class="absolute top-1 right-1 bg-black/50 text-white text-xs rounded-full px-1"
          @click="confirmRemove(att.id)"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Main input container -->
    <div class="relative w-full flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/5 px-3 py-2 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-surface-900/95">

      <!-- Plus Button -->
      <div class="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          ref="menuButton"
          @click="togglePopover"
          rounded
          aria-label="More options"
          class="!w-11 !h-11 flex items-center justify-center transition-colors duration-200
                 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <i class="pi pi-plus text-gray-700 dark:text-gray-200 text-lg"></i>
        </Button>

        <!-- Popover Menu -->
        <Popover ref="popoverRef" class="flex flex-col gap-2 p-2 bg-white dark:bg-sunset-800 rounded-lg min-w-[140px] text-black">
          <div >
            <Button
              icon="pi pi-paperclip"
              label="Attach File"
              text
              class="!justify-start"
              @click="openFileDialogAndClose"
            />
            <Button
              icon="pi pi-cog"
              label="Settings"
              text
              class="!justify-start"
            />
          </div>
        </Popover>
      </div>

      <!-- Center: textarea only (actions now render above) -->
      <div class="flex-1 min-w-0">
        <div class="max-h-32 overflow-y-auto">
          <textarea
            ref="textInputRef"
            v-model="internalValue"
            :placeholder="placeholder"
            :disabled="isLoading"
            class="w-full resize-none bg-transparent border-none outline-none px-14 py-2 text-base placeholder:text-slate-400 dark:text-slate-100"
            rows="1"
            @input="autoResize"
            @keydown="handleKeydown"
          />
        </div>
      </div>

      <!-- Send Button -->
      <div class="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          icon="pi pi-send"
          :loading="isLoading"
          :disabled="!canSend"
          @click="handleSend"
          class="p-button-rounded p-button-primary"
          v-tooltip.top="'Send message (Enter)'"
        />
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/*"
      :multiple="maxAttachments > 1"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import Button from 'primevue/button'
import Popover from 'primevue/popover'

const props = defineProps({
  modelValue: { type: String, required: true },
  isLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Type your message...' },
  attachments: { type: Array, default: () => [] },
  maxAttachments: { type: Number, default: 3 },
  actionOptions: { type: Array, default: () => [] },
  showActionButtons: { type: Boolean, default: false },
  canRestart: { type: Boolean, default: false },
  showTextModeToggle: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:modelValue',
  'send',
  'add-attachments',
  'remove-attachment',
  'action-click',
  'restart',
  'switch-to-text'
])

const internalValue = ref(props.modelValue)
const textInputRef = ref(null)
const fileInputRef = ref(null)
const popoverRef = ref(null)

const canSend = computed(() => {
  if (props.isLoading) return false
  const hasText = internalValue.value?.trim()?.length > 0
  const hasAttachments = props.attachments?.length > 0
  return hasText || hasAttachments
})

watch(() => props.modelValue, v => (internalValue.value = v))
watch(internalValue, v => emit('update:modelValue', v))

function autoResize(e) {
  const el = e.target
  el.style.height = 'auto'
  const maxHeight = 128 // e.g., 32 * 4px line height = 128px, same as max-h-32
  el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
}

function handleKeydown(evt) {
  if (evt.key === 'Enter' && !evt.shiftKey) {
    evt.preventDefault()
    handleSend()
  }
}

function handleSend() {
  if (!canSend.value) return
  emit('send')
  internalValue.value = ''
  nextTick(() => {
    if (textInputRef.value) textInputRef.value.style.height = 'auto'
  })
}

function togglePopover(e) {
  popoverRef.value?.toggle(e)
}

function openFileDialogAndClose() {
  openFileDialog()
  popoverRef.value?.hide()
}

function openFileDialog() {
  if (props.isLoading) return
  fileInputRef.value?.click()
}

function handleFileChange(event) {
  const rawFiles = event?.target?.files ? Array.from(event.target.files) : []
  if (!rawFiles.length) return
  const allowed = Math.max(0, props.maxAttachments - (props.attachments?.length || 0))
  const selected = rawFiles.slice(0, allowed)
  emit('add-attachments', selected)
  event.target.value = ''
}

function confirmRemove(attachmentId) {
  emit('remove-attachment', attachmentId)
}

function handleActionClick(option) {
  emit('action-click', option)
}

function resolveAttachmentUrl(att) {
  return att?.previewUrl || att?.signedUrl || att?.url || att?.tempUrl || null
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
