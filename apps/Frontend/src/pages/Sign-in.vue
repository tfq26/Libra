<template>
  <div class="flex items-center justify-center min-h-screen p-4 ">
    
    <Transition
      appear
      enter-active-class="transition-all ease-out duration-500"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
    >
      <Card class="w-full max-w-md">
        
        <template #header>
          <img
            :src="isDarkMode ? darkLogo : lightLogo"
            alt="Libra Logo"
            class="mx-auto h-12 w-auto mt-8"
          />
        </template>
        
        <template #title>
          <h2 class="text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </template>
        
        <template #content>
          <div class="flex flex-col gap-6">
            <form @submit.prevent="handleSignIn" class="flex flex-col gap-6">
              
              <span class="p-float-label">
                <InputText id="email" v-model="email" type="email" class="w-full" required />
                <label for="email">Email address</label>
              </span>

              <span class="p-float-label">
                <Password 
                  id="password" 
                  v-model="password" 
                  class="w-full" 
                  :feedback="false" 
                  toggleMask 
                  required 
                  inputClass="w-full" 
                />
                <label for="password">Password</label>
              </span>
              
              <Message v-if="error" severity="error" :closable="false">
                {{ error }}
              </Message>

              <Button type="submit" label="Sign In" class="w-full" :loading="loading" />
            </form>

            <Divider align="center" type="dashed">
              <span class="text-gray-500 dark:text-gray-400">Or continue with</span>
            </Divider>

            <Button 
              label="Sign in with Google" 
              icon="pi pi-google" 
              class="w-full p-button-secondary" 
              @click="signInWithGoogle"
              :loading="loading" 
            />
          </div>
        </template>
        
        <template #footer>
          <div class="text-center text-sm">
            <p class="text-gray-600 dark:text-gray-400">
              Don't have an account?
              <router-link to="/sign-up" class="font-medium text-primary hover:underline">
                Sign up
              </router-link>
            </p>
          </div>
        </template>
      </Card>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { auth } from '../firebase/config';

// --- UPDATED IMPORTS ---
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Message from 'primevue/message';
import Card from 'primevue/card';         // Added Card
import Divider from 'primevue/divider';   // Added Divider
// --- END UPDATED IMPORTS ---

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

  const signInWithGoogle = async () => {
    // Start server-side OAuth flow
    loading.value = true;
    error.value = '';
    try {
      window.location.href = '/api/auth/google';
    } catch (err) {
      console.error('Google sign in redirect error:', err);
      error.value = 'Failed to start Google sign in. Please try again.';
      loading.value = false;
    }
  };
</script>