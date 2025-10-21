<template>
  <div
    id="messages-container"
    ref="messagesContainer"
    class="flex-grow overflow-y-auto p-4 custom-scrollbar"
  >
    <TransitionGroup name="fade" tag="div" class="space-y-4">
      <MessageBubble
        v-for="(msg, index) in messages"
        :key="msg.id || index"
        :message="msg"
        @show-full-message="$emit('show-full-message', $event)"
      />
    </TransitionGroup>
    <TypingIndicator v-if="isLoading" class="my-2" />
  </div>
</template>

<<script setup>
// 1. Import defineExpose
import { ref, watch, defineEmits, defineProps, defineExpose } from 'vue'; 
import MessageBubble from './MessageBubble.vue';
import TypingIndicator from './TypingIndicator.vue';
import { TransitionGroup } from 'vue';

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['show-full-message']);

const messagesContainer = ref(null);

// 2. Expose the container ref to the parent component
defineExpose({ messagesContainer });

// --- LOGGING (retained for debugging) ---
watch(() => props.messages.length, (newLength) => {
  console.log(`[MessageList] Received ${newLength} messages.`);
}, { immediate: true });
// --- END LOGGING ---

</script>

<style scoped>
/* Smooth fade-in animation for new messages */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Custom scroll styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(100, 100, 100, 0.3);
  border-radius: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(100, 100, 100, 0.5);
}
</style>

