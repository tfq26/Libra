<template>
  <div>
    <!-- Desktop Floating Navigation (Hidden on mobile) -->
    <div class="hidden md:flex fixed top-6 right-6 z-50 flex-row items-center space-x-3">
      <!-- Standard Navigation Links -->
      <router-link 
        to="/"
        class="bg-ochre-800 hover:bg-ochre-700 text-white p-4 rounded-full shadow-md transition flex items-center justify-center"
        title="Home"
        :class="{ 'bg-blue-600': route.path === '/' }"
      >
        <i class="pi pi-home"></i>
      </router-link>

      <router-link 
        to="/chat"
        class="bg-ochre-800 hover:bg-ochre-700 text-white p-4 rounded-full shadow-md transition flex items-center justify-center"
        title="Chat"
        :class="{ 'bg-blue-600': route.path.startsWith('/chat') }"
      >
        <i class="pi pi-comment"></i>
      </router-link>

      <router-link 
        to="/history"
        class="bg-ochre-800 hover:bg-ochre-700 text-white p-4 rounded-full shadow-md transition flex items-center justify-center"
        title="History"
        :class="{ 'bg-blue-600': route.path.startsWith('/history') }"
      >
        <i class="pi pi-book"></i>
      </router-link>

      <!-- Clerk Auth Logic for Desktop -->
      <template v-if="isLoaded">
        <template v-if="isSignedIn">
          <!-- Signed In: Clerk User Button (wrapped to match button size) -->
          <div class="p-1 rounded-full bg-ochre-800 shadow-md">
            <UserButton after-sign-out-url="/" />
          </div>
        </template>
        <template v-else>
          <!-- Signed Out: Sign In Link -->
          <router-link 
            to="/sign-in"
            class="bg-ochre-800 hover:bg-ochre-700 text-white p-4 rounded-full shadow-md transition flex items-center justify-center"
            title="Sign In"
            :class="{ 'bg-blue-600': route.path.startsWith('/sign-in') }"
          >
            <i class="pi pi-sign-in"></i>
          </router-link>
        </template>
      </template>
    </div>


    <!-- Mobile Bottom Navigation (Hidden on desktop) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-ochre-800 shadow-t-lg z-50">
      <div class="flex justify-around items-center h-16">
        <!-- Standard Navigation Links -->
        <router-link 
          to="/"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="route.path === '/' ? 'text-white' : 'text-ochre-300 hover:text-white'"
        >
          <i class="pi pi-home text-xl"></i>
          <span class="text-xs mt-1">Home</span>
        </router-link>

        <router-link 
          to="/chat"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="route.path.startsWith('/chat') ? 'text-white' : 'text-ochre-300 hover:text-white'"
        >
          <i class="pi pi-comment text-xl"></i>
          <span class="text-xs mt-1">Chat</span>
        </router-link>

        <router-link 
          to="/history"
          class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
          :class="route.path.startsWith('/history') ? 'text-white' : 'text-ochre-300 hover:text-white'"
        >
          <i class="pi pi-book text-xl"></i>
          <span class="text-xs mt-1">History</span>
        </router-link>

        <!-- Clerk Auth Logic for Mobile -->
        <template v-if="isLoaded">
          <template v-if="isSignedIn">
            <!-- Signed In: Profile/User Button Link -->
            <div class="flex flex-col p-0 items-center justify-center w-full h-full transition-colors duration-200 text-white">
                <!-- Placing UserButton here to handle profile access and sign out -->
                <div class="h-4 w-auto mb-1">
                    <UserButton after-sign-out-url="/" />
                </div>
                <span class="text-xs">Profile</span>
            </div>
          </template>
          <template v-else>
            <!-- Signed Out: Sign In Link -->
            <router-link 
              to="/sign-in"
              class="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
              :class="route.path.startsWith('/sign-in') ? 'text-white' : 'text-ochre-300 hover:text-white'"
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
import { useRoute } from 'vue-router';
import 'primeicons/primeicons.css'
import { useAuth, UserButton } from '@clerk/vue'; // <--- New Clerk Imports

// Fetch auth state from Clerk
const { isLoaded, isSignedIn } = useAuth(); // <--- New Clerk Hook
const route = useRoute();
</script>
