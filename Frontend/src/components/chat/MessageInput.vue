<template>
  <div class="flex-grow mt-2">
    <input
      type="text"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="emitSend"
      :placeholder="placeholder"
      :disabled="isLoading"
      class="w-full p-4 border border-gray-300 rounded-lg text-lg focus:ring-2
       focus:ring-night-500 focus:border-night-500 disabled:bg-gray-100 
       transition dark:text-sunset-200 dark:bg-ochre-800 dark:border-ochre-800"
    />
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

function emitSend() {
  if (props.modelValue.trim()) {
    emit('send');
  }
}
</script>
