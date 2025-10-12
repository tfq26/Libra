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
          Sign in to your account
        </h2>
      </div>

      <div class="rounded-lg bg-white dark:bg-gray-800 p-8 shadow-lg">
        <form @submit.prevent="handleSignIn">
          <div class="flex flex-col gap-6">
            <div>
              <label for="email" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Email address</label>
              <InputText id="email" v-model="email" type="email" class="w-full" required />
            </div>

            <div>
              <label for="password" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
              <Password id="password" v-model="password" class="w-full" :feedback="false" toggleMask required />
            </div>
          </div>
          
          <Message v-if="error" severity="error" class="mt-4 w-full">
            {{ error }}
          </Message>

          <Button type="submit" label="Sign In" class="w-full mt-6" :loading="loading" />
        </form>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        <Button 
          label="Sign in with Google" 
          icon="pi pi-google" 
          class="w-full p-button-secondary" 
          @click="signInWithGoogle"
          :loading="loading" 
        />
      </div>
      
      <div class="text-center text-sm">
        <p class="text-gray-600 dark:text-gray-400">
          Don't have an account?
          <router-link to="/sign-up" class="font-medium text-primary hover:underline">
            Sign up
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
import { auth, GoogleAuthProvider, signInWithPopup } from '../firebase/config'; // Import Google auth features

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
const loading = ref(false);
const error = ref('');

const isDarkMode = computed(() => document.documentElement.classList.contains('dark'));

const handleSignIn = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please enter both email and password.';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await authStore.login(email.value, password.value);
    const redirectPath = route.query.redirect || '/chat';
    router.push(redirectPath);
  } catch (err) {
    console.error('Sign in error:', err);
    error.value = 'Failed to sign in. Please check your credentials.';
  } finally {
    loading.value = false;
  }
};

// This function handles the Google Sign-In popup
const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  loading.value = true;
  error.value = '';
  try {
    await signInWithPopup(auth, provider);
    const redirectPath = route.query.redirect || '/chat';
    router.push(redirectPath);
  } catch (err) {
    console.error('Google sign in error:', err);
    // This ignores the error if the user just closes the popup
    if (err.code !== 'auth/popup-closed-by-user') {
      error.value = 'Failed to sign in with Google. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};
</script>