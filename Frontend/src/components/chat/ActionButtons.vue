<template>
  <div class="flex flex-wrap justify-center gap-2 py-2"> 
    <Button
      v-for="(option, index) in options"
      :key="index"
      :label="typeof option === 'string' ? option : option.label"
      :icon="typeof option === 'object' && option.icon ? option.icon : null"
      :disabled="disabled || loadingIndex !== null" :loading="loadingIndex === index"
      class="p-button-lg" @click="handleClick(option, index)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'

const props = defineProps({
  options: {
    type: Array,
    required: true,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['response'])

const loadingIndex = ref(null)

function handleClick(option, index) {
  // Set a brief loading state for visual feedback
  loadingIndex.value = index 
  
  // NOTE: This timeout is purely for the visual spin. 
  // The logic in chat.vue immediately changes the mode to 'text' 
  // and disables the action buttons area.
  setTimeout(() => {
    loadingIndex.value = null 
  }, 600) 
  
  const responseText = typeof option === 'string' ? option : option.label
  emit('response', responseText)
}
</script>

<style scoped>
/* Keep existing styles */
.p-button {
  transition: background-color 0.2s ease, transform 0.1s ease;
}
.p-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* You will need to define p-button-lg in your global CSS or theme */
/* For example: .p-button-lg .p-button-label { font-size: 1.1rem; padding: 0.75rem 1.5rem; } */
</style>