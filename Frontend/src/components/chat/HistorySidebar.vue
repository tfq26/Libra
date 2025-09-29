<template>
    <aside
      class="absolute md:relative h-full w-full md:w-72 flex flex-col bg-gray-800 text-white p-4 shadow-xl transition-transform duration-300 ease-in-out z-10"
      :class="{ '-translate-x-full': mobileView === 'chat' }"
    >
      <h2 class="text-2xl font-semibold mb-4 pb-2 border-b border-gray-700 flex-shrink-0">History</h2>
      <button
        @click="$emit('newChat')"
        class="w-full py-2 mb-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-md flex-shrink-0"
      >
        Start New Chat <span class="ml-1">➕</span>
      </button>
  
      <ul class="flex-grow space-y-2 overflow-y-auto custom-scrollbar">
        <li v-if="conversations.length === 0" class="text-gray-400 text-sm italic px-2">
          {{ isLoadingHistory ? 'Loading...' : 'No conversations yet.' }}
        </li>
        <li
          v-for="conv in conversations"
          :key="conv.id"
          @click="$emit('selectConversation', conv.id)"
          :class="{
            'bg-blue-600 text-white': conv.id === currentConversationId,
            'text-gray-300 hover:bg-gray-700': conv.id !== currentConversationId
          }"
          class="p-3 cursor-pointer rounded-lg transition duration-100 truncate"
        >
          {{ conv.title || 'Untitled Chat' }}
        </li>
      </ul>
    </aside>
  </template>
  
  <script setup>
  defineProps({
    conversations: Array,
    isLoadingHistory: Boolean,
    currentConversationId: String,
    mobileView: String
  });
  
  defineEmits(['newChat', 'selectConversation']);
  </script>