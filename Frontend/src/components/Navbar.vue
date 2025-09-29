<template>
    <nav class="bg-gray-800 p-4 shadow-lg fixed top-0 w-full z-10">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <router-link to="/" class="flex items-center space-x-3 hover:opacity-90 transition-opacity">
          <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0l-1 1M14 8h-4"></path>
          </svg>
          <span class="text-white text-xl font-bold tracking-wider">Libra Chat Support</span>
        </router-link>
  
        <div class="hidden md:flex items-center space-x-6">
          <router-link 
            to="/" 
            class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="{ 'text-white bg-gray-700': $route.path === '/' }"
          >
            Home
          </router-link>
          <router-link 
            to="/chat" 
            class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="{ 'text-white bg-gray-700': $route.path === '/chat' || $route.path.startsWith('/chat/') }"
          >
            Chat
          </router-link>
          <router-link 
            to="/history" 
            class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="{ 'text-white bg-gray-700': $route.path === '/history' || $route.path.startsWith('/history/') }"
          >
            History
          </router-link>
        </div>
  
        <div class="flex items-center space-x-4">
          <span class="text-gray-300 text-sm hidden sm:inline">
            User ID: <span class="font-medium text-blue-300">{{ userId }}</span>
          </span>
  
          <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="md:hidden text-gray-400 hover:text-white p-2 rounded-md">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!isMobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
  
      <div v-if="isMobileMenuOpen" class="md:hidden mt-2">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <router-link 
            to="/" 
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
            :class="{ 'text-white bg-gray-700': $route.path === '/' }"
            @click="isMobileMenuOpen = false"
          >
            Home
          </router-link>
          <router-link 
            to="/chat" 
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
            :class="{ 'text-white bg-gray-700': $route.path === '/chat' || $route.path.startsWith('/chat/') }"
            @click="isMobileMenuOpen = false"
          >
            Chat
          </router-link>
          <router-link 
            to="/history" 
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
            :class="{ 'text-white bg-gray-700': $route.path === '/history' || $route.path.startsWith('/history/') }"
            @click="isMobileMenuOpen = false"
          >
            History
          </router-link>
        </div>
      </div>
    </nav>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useRoute } from 'vue-router';
  
  // State is correctly defined here
  const userId = ref('user-123-test');
  const isMobileMenuOpen = ref(false);
  const route = useRoute(); // useRoute is necessary for checking $route.path
  </script>