<template>
    <nav class="bg-platinum-200 dark:bg-eerie_black-700 shadow-md fixed w-full z-10">
      <div class="container mx-auto py-4 px-6 sm:px-8 flex justify-between items-center">
        <div class="flex items-center">
          <svg class="h-8 w-8 text-saffron-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c1.657 0 3 .895 3 2s-1.343 2-3 2-3 .895-3 2 1.343 2 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <router-link to="/" class="ml-3 text-2xl font-bold text-eerie_black-500 dark:text-platinum-500">
            Libra
          </router-link>
        </div>
        <nav class="hidden sm:flex space-x-6">
          <router-link
            v-for="route in navRoutes"
            :key="route.name"
            :to="route.path"
            class="text-eerie_black-400 dark:text-platinum-400 hover:text-saffron-500 transition-colors duration-300"
          >
            {{ route.name }}
          </router-link>
        </nav>
        <div class="flex items-center">
          <button 
            @click="toggleDarkMode"
            class="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Toggle dark mode"
          >
            <span v-if="darkMode">☀️</span>
            <span v-else>🌙</span>
          </button>
        </div>
      </div>
    </nav>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  
  // Dark mode state
  const darkMode = ref(false);
  
  // Access the router instance
  const router = useRouter();
  
  // Filter routes for navigation links
  const navRoutes = router.getRoutes().filter(route => 
    route.name && ['Home', 'Chat'].includes(route.name)
  );
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value;
    if (darkMode.value) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };
  
  // Check for saved theme preference
  onMounted(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      darkMode.value = true;
      document.documentElement.classList.add('dark');
    }
  });
  </script>