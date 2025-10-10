<template>
  <div class="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <transition
      appear
      enter-active-class="transition-transform duration-500 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
    >
      <div class="w-full max-w-md space-y-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          <img
            :src="isDarkMode ? lightLogo : darkLogo"
            alt="Libra Logo"
            class="mx-auto h-12 w-auto transition-transform duration-300 hover:scale-110"
          />
          <h2 class="mt-6 text-center text-3xl font-extrabold text-black dark:text-timberwolf-900">
            Create your account
          </h2>
        </div>

        <div class="mt-8 py-8 px-4 shadow-xl ring-1 ring-gray-900/5 bg-sunset-700 dark:bg-sunset-400/40 sm:rounded-xl sm:px-10">
          <form class="space-y-6" @submit.prevent="handleSignUp">
            <div>
              <label for="email" class="block text-sm font-medium text-black dark:text-timberwolf-900">
                Email address
              </label>
              <div class="mt-1">
                <input
                  id="email"
                  v-model="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="block w-full appearance-none rounded-lg border border-gray-300 bg-sunset-500 px-3 py-2 text-black
                   placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-lion-500 focus:outline-none
                    focus:ring-lion-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-black dark:text-timberwolf-900">
                Password
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  v-model="password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  required
                  class="block w-full appearance-none rounded-lg border border-gray-300 bg-sunset-500 px-3 py-2 text-black placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-lion-500 focus:outline-none focus:ring-lion-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label for="confirm-password" class="block text-sm font-medium text-black dark:text-timberwolf-900">
                Confirm Password
              </label>
              <div class="mt-1">
                <input
                  id="confirm-password"
                  v-model="confirmPassword"
                  name="confirm-password"
                  type="password"
                  autocomplete="new-password"
                  required
                  class="block w-full appearance-none rounded-lg border border-gray-300 bg-sunset-500 px-3 py-2 text-black placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-lion-500 focus:outline-none focus:ring-lion-500 sm:text-sm"
                />
              </div>
            </div>

            <div v-if="error" class="rounded-md border border-red-400 bg-red-100 p-3 text-red-700 dark:border-red-600 dark:bg-red-900 dark:text-red-300">
              <p>{{ error }}</p>
            </div>

            <div>
              <button
                type="submit"
                :disabled="loading"
                class="flex w-full justify-center rounded-lg border border-transparent bg-lion-600 dark:bg-ochre-600 py-2 px-4 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.01]
                 hover:bg-sunset-300 dark:hover:bg-sunset-400 focus:outline-none focus:ring-2 focus:ring-lion-500 focus:ring-offset-2 disabled:cursor-not-allowed cursor-pointer disabled:opacity-50 dark:focus:ring-offset-gray-800"
              >
                <span v-if="loading">Creating account...</span>
                <span v-else>Sign up</span>
              </button>
            </div>
          </form>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600 dark:text-timberwolf-900">
              Already have an account?
              <router-link
                to="/sign-in"
                class="font-medium text-lion-600 transition-colors duration-200 hover:text-sunset-300 dark:text-ochre-700 dark:hover:text-sunset-300"
              >
                Sign In
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import lightLogo from '../assets/libra-svgrepo-com-light.svg';
import darkLogo from '../assets/libra-svgrepo-com-dark.svg'; // Assuming you have a dark version of the logo

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

const handleSignUp = async () => {
  // --- 1. Client-side validation ---
  if (!email.value || !password.value || !confirmPassword.value) {
    error.value = 'Please fill out all fields.';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters long.';
    return;
  }

  try {
    loading.value = true;
    error.value = '';
    
    // --- 2. Call the Pinia store action ---
    const result = await authStore.register(email.value, password.value);
    
    // --- 3. Redirect on success ---
    if (result.success) {
      router.push('/');
    } else {
      // Use the error from the store if registration fails
      error.value = result.error || 'Failed to create an account.';
    }
  } catch (err) {
    // This catches unexpected errors
    console.error('Sign up error:', err);
    error.value = 'An unexpected error occurred. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* No scoped styles needed as all styling is handled by Tailwind classes */
</style>