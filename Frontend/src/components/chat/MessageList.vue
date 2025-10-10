<template>
  <div
    id="messages-container"
    ref="messagesContainer"
    class="flex-grow overflow-y-auto rounded-xl px-4 shadow-inner
           border border-gray-200 bg-sunset-600 dark:bg-timberwolf-100
           min-h-[calc(100vh-14rem)] transition-colors duration-300"
  >
    <TransitionGroup name="fade" tag="div" class="space-y-4">
      <MessageBubble
        v-for="(msg, index) in messages"
        :key="msg.id || index"
        :message="msg"
      />
    </TransitionGroup>
    <TypingIndicator v-if="isLoading" class="mt-2" />
  </div>
</template>

<script setup>
import { onUpdated, ref, nextTick, watch } from 'vue'; 
import MessageBubble from './MessageBubble.vue';
import TypingIndicator from './TypingIndicator.vue';

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

const messagesContainer = ref(null);

// --- LOGGING (retained for debugging) ---
watch(() => props.messages.length, (newLength) => {
  console.log(`[MessageList] Received ${newLength} messages.`);
  if (newLength > 0) {
    console.log('[MessageList] Last message content:', props.messages.at(-1)?.content);
  }
}, { immediate: true });
// --- END LOGGING ---

// --- UPDATED SCROLL LOGIC ---
onUpdated(async () => {
  await nextTick();
  const el = messagesContainer.value;
  
  if (el) {
    // Determine if the user is currently scrolled near the bottom (e.g., within 100px)
    const isNearBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;

    // Only auto-scroll if the chat is loading (new message imminent) OR 
    // the user was already near the bottom.
    if (props.isLoading || isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }
});
// --- END UPDATED SCROLL LOGIC ---
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
