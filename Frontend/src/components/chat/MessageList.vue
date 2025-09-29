<template>
    <div
      id="messages-container"
      ref="messagesContainer"
      class="flex-grow overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 space-y-4 shadow-inner custom-scrollbar"
    >
      <MessageBubble
        v-for="(msg, index) in messages"
        :key="index"
        :message="msg"
      />
      <TypingIndicator v-if="isLoading" />
    </div>
  </template>
  
  <script setup>
  import MessageBubble from './MessageBubble.vue';
  import TypingIndicator from './TypingIndicator.vue';
  
  defineProps({
    messages: {
      type: Array,
      required: true
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  });
  </script>