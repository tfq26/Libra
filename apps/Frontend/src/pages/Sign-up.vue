<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <div class="w-full max-w-md space-y-8">
      <div>
        <img
          :src="isDarkMode ? darkLogo : lightLogo"
          alt="Libra Logo"
          class="mx-auto h-12 w-auto"
        />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Create your account
        </h2>
      </div>

      <form class="space-y-6" @submit.prevent="handleSignUp">
        <div class="rounded-lg bg-sunset-600 dark:bg-sunset-400 p-8 shadow-lg">
          <div class="flex flex-col gap-6">
            <div>
              <label for="email" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Email address</label>
              <InputText id="email" v-model="email" type="email" class="w-full" required />
            </div>

            <div>
              <label for="password" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
              <Password id="password" v-model="password" class="w-full" :feedback="true" toggleMask required />
            </div>
            
            <div>
              <label for="confirm-password" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Confirm Password</label>
              <Password id="confirm-password" v-model="confirmPassword" class="w-full" :feedback="false" toggleMask required />
            </div>
          </div>
          
          <Message v-if="error" severity="error" class="mt-4 w-full">
            {{ error }}
          </Message>

          <Button type="submit" label="Sign Up" class="w-full mt-6" :loading="loading" />
        </div>
      </form>
      
      <div class="text-center text-sm">
        <p class="text-gray-600 dark:text-gray-400">
          Already have an account?
          <router-link to="/sign-in" class="font-medium text-primary hover:underline">
            Sign in
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Message from 'primevue/message';

import lightLogo from '../assets/libra-svgrepo-com-light.svg';
import darkLogo from '../assets/libra-svgrepo-com-dark.svg';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

const isDarkMode = computed(() => document.documentElement.classList.contains('dark'));

const handleSignUp = async () => {
  // Client-side validation
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters long.';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // Call the register action. If it fails, it throws an error.
    await authStore.register(email.value, password.value);
    
    // On success, redirect.
    const redirectPath = route.query.redirect || '/chat';
    router.push(redirectPath);

  } catch (err) {
    console.error('Sign up error:', err);
    error.value = 'Failed to create an account. The email may already be in use.';
  } finally {
    loading.value = false;
  }
};
</script>