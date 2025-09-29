<template>
    <div class="space-y-3">
      <button
        v-for="(option, index) in options"
        :key="index"
        @click="emitResponse(option)"
        class="w-full text-center p-3 bg-ochre-500 text-white font-semibold rounded-xl shadow hover:bg-ochre-600 transition"
      >
        {{ option }}
      </button>
    </div>
  </template>
  
  <script setup>
  defineProps({
    options: {
      type: Array,
      required: true,
    }
  });
  
  const emit = defineEmits(['response']);
  
  function emitResponse(responseText) {
    emit('response', responseText);
  }
  </script>