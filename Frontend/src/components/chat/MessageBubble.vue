<template>
    <div
      :class="{
        'bg-blue-500 text-white ml-auto w-fit h-fit': message.role === 'user',
        'bg-gray-200 text-gray-800 mr-auto w-fit h-fit': message.role === 'assistant'
      }"
      class="p-3 rounded-xl max-w-2xl shadow-md whitespace-pre-wrap break-words"
    >
      {{ message.content }}
    </div>
  </template>
  
  <script setup>
  defineProps({
    message: {
      type: Object,
      required: true
    }
  });
  </script>