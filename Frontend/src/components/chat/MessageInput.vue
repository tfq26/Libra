<template>
    <div class="flex items-center space-x-3 mt-2 flex-shrink-0">
      <input
        type="text"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        @keyup.enter="send"
        :placeholder="placeholder"
        :disabled="isLoading"
        class="flex-grow p-4 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition"
      />
      <button
        @click="send"
        :disabled="isLoading || !modelValue.trim()"
        class="p-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition disabled:bg-gray-400"
      >
        Send
      </button>
    </div>
  </template>
  
  <script setup>
  const props = defineProps({
    modelValue: {
      type: String,
      required: true
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: 'Type your message...'
    }
  });
  
  const emit = defineEmits(['update:modelValue', 'send']);
  
  function send() {
    if (props.modelValue.trim()) {
      emit('send');
    }
  }
  </script>