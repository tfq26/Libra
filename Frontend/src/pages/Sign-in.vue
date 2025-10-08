<template>
  <div class="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <transition
      appear
      enter-active-class="transition-transform duration-500 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
    >
      <div class="w-full max-w-md space-y-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          <img 
            src="../assets/libra-svgrepo-com-light.svg" 
            alt="Libra Logo" 
            class="mx-auto h-12 w-auto transition-transform duration-300 hover:scale-110"
          />
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-timberwolf-100">
            Sign in to your account
          </h2>
        </div>

        <div class="mt-8 py-8 px-4 shadow-xl ring-1 ring-gray-900/5 bg-sunset-700 sm:rounded-xl sm:px-10">
          <form class="space-y-6" @submit.prevent="handleSignIn">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-timberwolf-200">
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
                  class="block w-full appearance-none rounded-lg border border-sunset-300 bg-sunset-600 px-3 py-2 text-black placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-lion-500 focus:outline-none focus:ring-lion-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-timberwolf-200">
                Password
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  v-model="password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="block w-full appearance-none rounded-lg border border-sunset-300 bg-sunset-600 px-3 py-2 text-black placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-lion-500 focus:outline-none focus:ring-lion-500 sm:text-sm"
                />
              </div>
            </div>

            <div v-if="error" class="rounded-md border border-red-400 bg-red-100 p-3 text-red-700 dark:border-red-600 dark:bg-red-900 dark:text-red-300">
              <p>{{ error }}</p>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="remember-me"
                  v-model="rememberMe"
                  name="remember-me"
                  type="checkbox"
                  class="h-4 w-4 rounded border-sunset-300 bg-sunset-600 text-lion-600 focus:ring-lion-500"
                />
                <label for="remember-me" class="ml-2 block text-sm text-gray-900 dark:text-timberwolf-200">
                  Remember me
                </label>
              </div>

              <div class="text-sm">
                <a
                  href="#"
                  @click.prevent="handleRoute('/forgot-password')"
                  class="font-medium text-lion-600 transition-colors duration-200 hover:text-sunset-300 dark:text-lion-400 dark:hover:text-sunset-300"
                >
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                :disabled="loading"
                class="flex w-full justify-center rounded-lg border border-transparent bg-lion-600 py-2 px-4 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:bg-sunset-400 focus:outline-none focus:ring-2 focus:ring-lion-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
              >
                <span v-if="loading">Signing in...</span>
                <span v-else>Sign in</span>
              </button>
            </div>
          </form>

          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class=" px-2 text-black bg-sunset-700">Or continue with</span>
              </div>
            </div>

            <div class="mt-6">
              <a
                href="#"
                @click.prevent="signInWithGoogle"
                class="group flex w-full justify-center rounded-lg border border-sunset-300 bg-lion-600 py-2 px-4 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:scale-[1.01] hover:bg-sunset-400 "
              >
                <svg
                  class="mr-2 h-5 w-5 text-sunset-600"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                  />
                </svg>
                Sign in with Google
              </a>
            </div>
          </div>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600 dark:text-timberwolf-300">
              Don't have an account?
              <a
                href="#"
                @click.prevent="handleRoute('/sign-up')"
                class="font-medium text-lion-600 transition-colors duration-200 hover:text-sunset-300 dark:text-lion-400 dark:hover:text-sunset-300"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToast } from 'primevue/usetoast';
import { auth, GoogleAuthProvider, signInWithPopup } from '../firebase/config';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');

const handleSignIn = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please enter both email and password';
    return;
  }

  try {
    loading.value = true;
    error.value = '';
    await authStore.login(email.value, password.value);
    
    // Redirect to intended page or dashboard
    const redirectPath = route.query.redirect || '/dashboard';
    router.push(redirectPath);

  } catch (err) {
    console.error('Sign in error:', err);
    error.value = err.message || 'Failed to sign in. Please try again.';
  } finally {
    loading.value = false;
  }
};

const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    loading.value = true;
    error.value = '';
    
    await signInWithPopup(auth, provider);
    
    const redirectPath = route.query.redirect || '/dashboard';
    router.push(redirectPath);

  } catch (err) {
    console.error('Google sign in error:', err);
    if (err.code !== 'auth/popup-closed-by-user') {
      error.value = 'Failed to sign in with Google. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};

// Emulate router-link behavior for external links if routes aren't defined
const handleRoute = (path) => {
    // In a real application, you'd use router.push(path) here
    console.log(`Navigating to: ${path}`);
    router.push(path); // Assuming your routes are set up for these paths
};

onMounted(() => {
  if (route.query.redirect) {
    toast.add({ 
      severity: 'info', 
      summary: 'Authentication Required', 
      detail: 'Please sign in to access that page.', 
      life: 5000 
    });
  }
});
</script>

<style scoped>
/* Scoped styles can be removed as all styling is handled by Tailwind classes */
</style>