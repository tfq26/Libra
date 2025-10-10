<template>
  <div>
    <div class="hidden md:flex fixed top-6 right-6 z-50 flex-row items-center space-x-3">
      <Button
        icon="pi pi-home"
        :class="{
          'p-button-warning': route.path === '/',
          'p-button-secondary': route.path !== '/',
          'p-button-rounded p-button-icon-only': true,
          'p-button-lg': true
        }"
        title="Home"
        @click="router.push('/')"
      />

      <Button
        icon="pi pi-comment"
        :class="{
          'p-button-warning': route.path.startsWith('/chat'),
          'p-button-secondary': !route.path.startsWith('/chat'),
          'p-button-rounded p-button-icon-only': true,
          'p-button-lg': true
        }"
        title="Chat"
        @click="router.push('/chat')"
      />

      <Button
        icon="pi pi-book"
        :class="{
          'p-button-warning': route.path.startsWith('/history'),
          'p-button-secondary': !route.path.startsWith('/history'),
          'p-button-rounded p-button-icon-only': true,
          'p-button-lg': true
        }"
        title="History"
        @click="router.push('/history')"
      />

      <template v-if="!authStore.loading">
        <template v-if="authStore.isAuthenticated">
          <Button
            icon="pi pi-sign-out"
            class="p-button-rounded p-button-icon-only p-button-lg p-button-secondary"
            title="Sign Out"
            @click="handleLogout"
          />
        </template>
        <template v-else>
          <Button
            icon="pi pi-sign-in"
            :class="{
              'p-button-warning': route.path.startsWith('/sign-in'),
              'p-button-secondary': !route.path.startsWith('/sign-in'),
              'p-button-rounded p-button-icon-only': true,
              'p-button-lg': true
            }"
            title="Sign In"
            @click="router.push('/sign-in')"
          />
        </template>
      </template>
    </div>

    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-timberwolf-100 shadow-t-lg z-50">
      <div class="flex justify-around items-center h-16">
        <router-link 
          to="/"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="route.path === '/' ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'"
        >
          <i class="pi pi-home text-xl"></i>
          <span class="text-xs mt-1">Home</span>
        </router-link>

        <router-link 
          to="/chat"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="route.path.startsWith('/chat') ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'"
        >
          <i class="pi pi-comment text-xl"></i>
          <span class="text-xs mt-1">Chat</span>
        </router-link>

        <router-link 
          to="/history"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="route.path.startsWith('/history') ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'"
        >
          <i class="pi pi-book text-xl"></i>
          <span class="text-xs mt-1">History</span>
        </router-link>

        <template v-if="!authStore.loading">
          <template v-if="authStore.isAuthenticated">
            <button
              @click="handleLogout"
              class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200 text-gray-400 hover:text-yellow-500"
            >
              <i class="pi pi-sign-out text-xl"></i>
              <span class="text-xs mt-1">Sign Out</span>
            </button>
          </template>
          <template v-else>
            <router-link 
              to="/sign-in"
              class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
              :class="route.path.startsWith('/sign-in') ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'"
            >
              <i class="pi pi-user text-xl"></i>
              <span class="text-xs mt-1">Sign In</span>
            </router-link>
          </template>
        </template>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import 'primeicons/primeicons.css';
import { useAuthStore } from '../stores/auth';
import Button from 'primevue/button'; // Import PrimeVue Button

// Get the auth store and router instances
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

/**
 * Handles the user logout process.
 */
const handleLogout = async () => {
  await authStore.logout();
  // Redirect to the home page after logout to ensure a clean state
  router.push('/');
};
</script>

<style scoped>
/* Mobile nav background color adjusted to a darker tone for better contrast with PrimeVue colors */
.bg-gray-900 {
  background-color: #1f2937; /* Darker background */
}
/* The original ochre colors were replaced with PrimeVue/Tailwind utility colors:
   - ochre-800/700 -> p-button-secondary (default gray/blue depending on theme) or a neutral Tailwind gray
   - Active color (blue-600) -> p-button-warning (default yellow/orange, closer to ochre/lion theme)
   - Mobile active color -> text-yellow-500 (for better visibility on dark nav bar)
*/

/* Custom shadow for mobile bottom nav, if needed (PrimeVue often handles shadows) */
.shadow-t-lg {
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -2px rgba(0, 0, 0, 0.06);
}
</style>
