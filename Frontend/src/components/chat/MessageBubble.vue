<template>
  <div class="w-full flex" :class="{ 'justify-end': message.role === 'user', 'justify-start': message.role === 'assistant' }">
    
    <Avatar
      v-if="message.role === 'assistant'"
      shape="circle"
      image="https://www.svgrepo.com/show/410285/libra.svg"
      class="mr-3 bg-primary dark:bg-primary-400 text-white dark:text-gray-900 flex-shrink-0"
      style="background-color: #dee9fc; padding: 4px;"
    />

    <div
      :class="[
        'max-w-[90%] sm:max-w-[85%] px-4 py-3 rounded-2xl shadow-md break-words',
        message.role === 'user'
          ? 'bg-sunset-700 dark:bg-sunset-300 text-black dark:text-white rounded-br-lg'
          : 'bg-ochre-700 dark:bg-ochre-300 text-black dark:text-white rounded-bl-lg'
      ]"
    >
      <div class="markdown-content prose-sm" v-html="truncatedContent"></div>

      <Button
        v-if="isTruncated"
        label="Read More"
        icon="pi pi-window-maximize"
        @click="$emit('show-full-message', message.content)"
        class="p-button-text p-button-sm mt-2"
        :class="{ 'text-white !underline': message.role === 'user', 'text-black dark:text-primary-300': message.role === 'assistant' }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';

const md = new MarkdownIt({ html: false, linkify: true });

const props = defineProps({
  message: { type: Object, required: true }
});

defineEmits(['show-full-message']);

const CHARACTER_LIMIT = 400;

// Returns true if the message content is longer than our limit
const isTruncated = computed(() => {
  return props.message.content.length > CHARACTER_LIMIT;
});

// Returns the full or shortened message content
const truncatedContent = computed(() => {
  if (isTruncated.value) {
    // Find the last space before the limit to avoid cutting words
    const lastSpace = props.message.content.lastIndexOf(' ', CHARACTER_LIMIT);
    const shortContent = props.message.content.substring(0, lastSpace) + '...';
    return md.render(shortContent);
  }
  return md.render(props.message.content);
});
</script>