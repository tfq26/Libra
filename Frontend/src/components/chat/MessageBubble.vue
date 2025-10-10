<template>
  <div
    class="flex w-full my-1 md:my-2"
    :class="{
      'justify-end': message.role === 'user',
      'justify-start': message.role === 'assistant'
    }"
  >
    <transition name="fade-slide" appear>
      <div
        v-if="message.content"
        :class="[
          'max-w-[85%] md:max-w-2xl px-3 py-2 shadow-md rounded-2xl break-words',
          message.role === 'user'
            ? 'bg-blue-500 text-white self-end rounded-tr-none'
            : 'bg-gray-100 text-black self-start rounded-tl-none' 
        ]"
      >
        <div class="message-content-wrapper markdown-content"> <p 
            v-html="renderedContent"
            class="text-base leading-relaxed break-words min-w-[1rem] min-h-[1rem]"
            :class="{ 
              '!text-white': message.role === 'user',
              '!text-black': message.role === 'assistant',
            }"
          >
          </p>

          <small
            v-if="message.timestamp"
            class="block text-xs mt-1 opacity-70"
            :class="{ 'text-right': message.role === 'user', 'text-left': message.role === 'assistant' }"
          >
            {{ formatTime(message.timestamp) }}
          </small>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'; 
import MarkdownIt from 'markdown-it'; // <-- Import the library

// Initialize markdown-it instance
const md = new MarkdownIt({
  html: false, // Prevent raw HTML in messages for security
  linkify: true, // Auto-convert URLs to links (as discussed previously)
  typographer: false,
});

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

// NEW: Computed property to handle Markdown rendering
const renderedContent = computed(() => {
  if (!props.message.content) return '';
  // Convert Markdown content to HTML
  return md.render(props.message.content);
});

// KEEPING LOGS to confirm successful rendering after the fix
onMounted(() => {
  console.log(`[MessageBubble] Rendering message from [${props.message.role}]. Content check:`, !!props.message.content);
  if (props.message.content) {
    console.log(`[MessageBubble] Content length: ${props.message.content.length}. Sample: "${props.message.content.substring(0, 30)}..."`);
  }
});

function formatTime(ts) {
  try {
    const date = new Date(ts)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<style scoped>
/* Removed all :deep() selectors as they are no longer necessary */

.fade-slide-enter-active {
  transition: all 0.25s ease-out;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-slide-leave-active {
  transition: opacity 0.2s ease;
  opacity: 0;
}

/* Ensure text wraps gracefully on small screens */
p {
  word-break: break-word;
}

/* NEW: Styles to ensure Markdown elements look good inside the bubble */
/* If you want spacing between paragraphs, use this instead: */
.markdown-content :deep(p:not(:last-child)) {
  margin-bottom: 0.5rem; /* Add spacing between multiple paragraphs */
}

/* Style for lists */
.markdown-content :deep(ul), 
.markdown-content :deep(ol) {
  /* Keep existing styles */
  list-style-position: inside;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

/* Style for links (especially in the user's blue bubble) */
.markdown-content :deep(a) {
  text-decoration: underline;
  /* Use a lighter blue or similar for visibility on blue background */
  color: #c6f6d5; /* Tailwind's text-green-100 for visibility on bg-blue-500 */
}

/* Style for bold/italic/code */
.markdown-content :deep(strong), 
.markdown-content :deep(em) {
  /* Inherits text color, just ensures font weight is applied */
}
</style>