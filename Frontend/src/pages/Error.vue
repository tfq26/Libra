<template>
  <div class="flex min-h-screen w-full items-center justify-center py-12 px-4">
    <div class="flex w-full max-w-screen-lg flex-col items-center justify-center text-center">
      
      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <img 
          src="../assets/libra-svgrepo-com-light.svg" 
          alt="Libra Logo" 
          class="h-16 w-16 mb-6"
        />
      </transition>

      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out delay-100"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
      </transition>

      <div class="w-full transform rounded-xl border border-lion-100 bg-lion-50 p-6 shadow-lg transition-all duration-300 dark:bg-sunset-500">
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-lion-400 dark:text-lion-400">
          An Error Occurred
        </h1>
        <div v-if="!isDevMode" class="space-y-6">
          <transition
            appear
            enter-active-class="transition-opacity duration-500 ease-out delay-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
          >
            <div>
              <div class="text-6xl font-bold text-gray-800 mb-2 ">{{ errorCode }}</div>
              <p class="text-black text-lg">{{ errorMessage || 'An unexpected error occurred' }}</p>
            </div>
          </transition>
          
          <transition
            appear
            enter-active-class="transition-opacity duration-500 ease-out delay-300"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
          >
            <div class="bg-lion-50 dark:bg-lion-900/20 border-l-4 border-lion-500 p-4 rounded-r-md">
              <p class="text-sm text-lion-700 dark:text-lion-300">
                We apologize for the inconvenience. Our team has been notified of the issue.
              </p>
            </div>
          </transition>

          <transition
            appear
            enter-active-class="transition-opacity duration-500 ease-out delay-400"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
          >
            <div class="flex w-full flex-col justify-center space-y-4 sm:w-auto sm:flex-row sm:space-y-0 sm:space-x-4 mt-8">
              <button 
                @click="goBack"
                class="inline-block w-full sm:w-auto transform rounded-lg bg-lion-600 px-8 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-sunset-300 hover:shadow-xl dark:bg-lion-700 dark:hover:bg-lion-600"
              >
                Go Back
              </button>
              <button 
                @click="goHome"
                class="inline-block w-full sm:w-auto transform rounded-lg border border-gray-300 bg-white px-8 py-3 font-medium text-gray-800 transition-all duration-300 hover:scale-105 hover:bg-gray-100 hover:shadow-md dark:bg-lion-500 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Return Home
              </button>
            </div>
          </transition>
        </div>

        <div v-else class="space-y-6 text-left">
          <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-lion-400">Error Details</h2>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-lion-100 text-lion-800 dark:bg-lion-900/30 dark:text-lion-400">
              Developer Mode
            </span>
          </div>

          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-sunset-200">Error Code</h3>
              <p class="mt-1 text-lg font-mono text-sunset-300">{{ errorCode }}</p>
            </div>
            <div>
              <h3 class="text-sm font-medium text-sunset-200">Message</h3>
              <p class="mt-1 text-sunset-300">{{ errorMessage || 'No message provided' }}</p>
            </div>
            <div v-if="errorDetails">
              <h3 class="text-sm font-medium text-sunset-200">Details</h3>
              <pre class="mt-2 p-4 rounded-lg overflow-auto max-h-60 text-sm text-sunset-300">{{ formatErrorDetails(errorDetails) }}</pre>
            </div>
            <div v-if="errorStack">
              <div class="flex justify-between items-center">
                <h3 class="text-sm font-medium text-sunset-200">Stack Trace</h3>
                <button @click="copyToClipboard(errorStack)" class="text-xs text-lion-600 dark:text-lion-400 hover:underline">Copy</button>
              </div>
              <pre class="mt-2 p-4 rounded-lg overflow-auto max-h-60 text-xs text-sunset-300 font-mono">{{ errorStack }}</pre>
            </div>
          </div>

          <div class="pt-4 flex flex-col sm:flex-row gap-4">
            <button 
              @click="reloadPage"
              class="inline-block w-full sm:w-auto transform rounded-lg bg-lion-600 px-8 py-3 font-medium text-white shadow-lg
               transition-all duration-300 hover:scale-105 hover:bg-sunset-300 hover:shadow-xl cursor-pointer"
            >
              Reload Page
            </button>
            <button 
              @click="goHome"
              class="inline-block w-full text-timberwolf-800 sm:w-auto transform rounded-lg border border-gray-300 bg-timberwolf-200 px-8 py-3
               font-medium transition-all duration-300 hover:scale-105 hover:bg-timberwolf-400 hover:shadow-md cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end w-full max-w-screen-lg">
        <button 
          @click="toggleDevMode"
          class="text-xs text-lion-600 dark:text-lion-400 hover:text-lion-700 dark:hover:text-lion-200 flex items-center gap-1 cursor-pointer"
        >
          <i class="pi pi-cog"></i>
          <span>{{ isDevMode ? 'Switch to User View' : 'Switch to Developer View' }}</span>
        </button>
      </div>
    </div>

    <div v-if="showCopiedNotification" class="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-out">
        <i class="pi pi-check-circle"></i>
        <span>Copied to clipboard!</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

// --- Props ---
// Defines the inputs this component can receive.
const props = defineProps({
  code: {
    type: [String, Number],
    default: '500'
  },
  message: {
    type: String,
    default: ''
  },
  details: {
    type: [Object, String, Array],
    default: null
  },
  error: { // Added error prop to get stack trace
    type: [Object, Error],
    default: null
  },
  // This prop sets the INITIAL state of the dev mode toggle
  showDevMode: {
    type: Boolean,
    default: import.meta.env.DEV
  }
});

const router = useRouter();

// --- Reactive State ---
// This is the local, reactive state for the component.
// It's initialized from the prop but can be changed locally.
const isDevMode = ref(props.showDevMode);
const showCopiedNotification = ref(false);

// --- Computed Properties ---
// These automatically calculate values based on props.
const errorCode = computed(() => props.code);
const errorMessage = computed(() => props.message);
const errorDetails = computed(() => props.details);
const errorStack = computed(() => props.error?.stack || null);

// --- Methods ---
// These are the functions called by your @click handlers.
function goBack() {
  router.go(-1);
}

function goHome() {
  router.push('/');
}

function reloadPage() {
  window.location.reload();
}

/**
 * This is the function for your button. It toggles the reactive
 * 'isDevMode' ref, which causes the v-if/v-else in your
 * template to switch between the user and developer views.
 */
function toggleDevMode() {
  isDevMode.value = !isDevMode.value;
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showCopiedNotification.value = true;
    setTimeout(() => {
      showCopiedNotification.value = false;
    }, 3000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function formatErrorDetails(details) {
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch (e) {
    return String(details);
  }
}
</script>