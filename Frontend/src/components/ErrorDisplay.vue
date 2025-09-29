<template>
    <div v-if="message"
         class="flex items-center justify-between p-4 mb-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50"
         role="alert">
      
      <div class="flex items-center">
        <svg class="flex-shrink-0 inline w-5 h-5 mr-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
        </svg>
        <span class="sr-only">Error</span>
        <div>
          <span class="font-medium">An error occurred:</span> {{ message }}
        </div>
      </div>
  
      <button @click="dismissError" type="button" class="ml-4 -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 inline-flex items-center justify-center h-8 w-8" aria-label="Dismiss">
        <span class="sr-only">Dismiss</span>
        <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
      </button>
    </div>
  </template>
  
  <script setup>
  // This component accepts a 'message' as a prop from its parent.
  defineProps({
    message: {
      type: String,
      required: true,
    }
  });
  
  // It emits a 'dismiss' event when the close button is clicked.
  const emit = defineEmits(['dismiss']);
  
  function dismissError() {
    emit('dismiss');
  }
  </script>