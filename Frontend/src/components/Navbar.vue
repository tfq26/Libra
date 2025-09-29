<template>
  <div>
    <div class="hidden md:flex fixed top-6 right-6 z-50 flex-row items-center space-x-3">
      <router-link 
        to="/"
        class="bg-ochre-800 hover:bg-ochre-700 text-white p-4 rounded-full shadow-md transition flex items-center justify-center"
        title="Home"
        :class="{ 'bg-blue-600': $route.path === '/' }"
      >
        <i class="pi pi-home"></i>
      </router-link>

      <router-link 
        to="/chat"
        class="bg-ochre-800 hover:bg-ochre-700 text-white p-4 rounded-full shadow-md transition flex items-center justify-center"
        title="Chat"
        :class="{ 'bg-blue-600': $route.path.startsWith('/chat') }"
      >
        <i class="pi pi-comment"></i>
      </router-link>

      <router-link 
        to="/history"
        class="bg-ochre-800 hover:bg-ochre-700 text-white p-4 rounded-full shadow-md transition flex items-center justify-center"
        title="History"
        :class="{ 'bg-blue-600': $route.path.startsWith('/history') }"
      >
        <i class="pi pi-book"></i>
      </router-link>
    </div>


    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-ochre-800 shadow-t-lg z-50">
      <div class="flex justify-around items-center h-16">
        <router-link 
          to="/"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="$route.path === '/' ? 'text-white' : 'text-ochre-300 hover:text-white'"
        >
          <i class="pi pi-home text-xl"></i>
          <span class="text-xs mt-1">Home</span>
        </router-link>

        <router-link 
          to="/chat"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="$route.path.startsWith('/chat') ? 'text-white' : 'text-ochre-300 hover:text-white'"
        >
          <i class="pi pi-comment text-xl"></i>
          <span class="text-xs mt-1">Chat</span>
        </router-link>

        <router-link 
          to="/history"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="$route.path.startsWith('/history') ? 'text-white' : 'text-ochre-300 hover:text-white'"
        >
          <i class="pi pi-book text-xl"></i>
          <span class="text-xs mt-1">History</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import 'primeicons/primeicons.css'

// We only need useRoute to determine the active link style for both versions.
// All visibility logic is now handled by Tailwind's responsive classes (hidden, md:flex).
const route = useRoute();
</script>