<template>
  <div class="w-full flex items-center gap-2 bg-gray-100 dark:bg-ochre-300 p-2 rounded-xl">
    <span class="p-input-icon-right flex-grow relative">
      <Textarea
        ref="textAreaRef"
        v-model="internalValue"
        :placeholder="placeholder"
        :disabled="isLoading"
        autoResize
        rows="1"
        @keydown.enter.prevent="handleKeydown"
        @focus="handleFocus" 
        class="w-full bg-transparent border-none focus:ring-0 resize-none pr-8"
      />
      <i
        v-if="isLoading"
        class="pi pi-spinner pi-spin text-gray-400 absolute right-4 top-1/2 -translate-y-1/2"
      ></i>
    </span>

    <Button
      icon="pi pi-send"
      :loading="isLoading"
      :disabled="!internalValue?.trim() || isLoading"
      @click="handleSend"
      class="p-button-rounded p-button-text"
    />
  </div>
</template>

<script setup>
import { ref, watch, defineExpose } from 'vue';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

const props = defineProps({
  modelValue: { type: String, required: true },
  isLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Type your message...' }
})

const emit = defineEmits(['update:modelValue', 'send'])
const internalValue = ref(props.modelValue)
const textAreaRef = ref(null); // Ref to the Textarea component

watch(() => props.modelValue, val => (internalValue.value = val))
watch(internalValue, val => emit('update:modelValue', val))

function handleSend() {
  if (internalValue.value?.trim() && !props.isLoading) {
    emit('send')
    internalValue.value = ''
    emit('update:modelValue', '')
  }
}

// New handler for Enter key
function handleKeydown(event) {
  // If Shift is pressed, allow a new line (default Textarea behavior)
  if (event.shiftKey) return; 

  // Otherwise, prevent default (new line) and send the message
  event.preventDefault(); 
  handleSend();
}

// NEW: Expose method for external components (like chat.vue) to call focus
function focusInput() {
  // PrimeVue Textarea uses an internal ref 'inputRef', we need to access the native element
  if (textAreaRef.value?.$el?.querySelector('textarea')) {
    textAreaRef.value.$el.querySelector('textarea').focus();
  }
}

function handleFocus(event) {
  // Use a small timeout to allow the keyboard animation to finish
  setTimeout(() => {
    // Scrolls the element into the middle of the visible screen
    event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

defineExpose({
  focusInput
})
</script>

<style scoped>

</style>