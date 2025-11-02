import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth'; // 👈 Import the auth store
import { watch } from 'vue';

// --- Component Imports ---
import Home from '../pages/Home.vue';
import Chat from '../pages/Chat.vue';
import Profile from '../pages/Profile.vue';
import SignIn from '../pages/Sign-in.vue';
import SignUp from '../pages/Sign-up.vue';
import ErrorPage from '../pages/Error.vue';

// --- Route Definitions ---
export const routes = [
  { path: '', name: 'Home', component: Home, exact: true }, // Added 'exact: true' for clarity
  { path: '/chat/:id?', name: 'Chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/history', redirect: '/profile' }, // Redirect old history route to profile
  { path: '/sign-in', name: 'SignIn', component: SignIn, meta: { guestOnly: true } },
  { path: '/sign-up', name: 'SignUp', component: SignUp, meta: { guestOnly: true } },
  {
    path: '/error',
    name: 'Error',
    component: ErrorPage,
    props: route => ({
      code: route.query.code,
      message: route.query.message,
      error: route.query.error,
      details: route.query.details
    })
  },
  // 404 Catch-all
  {
    path: '/:pathMatch(.*)*',
    redirect: to => {
      // Avoid redirecting from the error page to itself
      if (to.name === 'Error') return false; 
      
      return {
        path: '/error',
        query: { code: '404', message: `Page not found: ${to.path}`, error: 'NOT_FOUND' }
      };
    }
  }
];

// --- Router Instance ---
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// --- Helper Functions ---

/**
 * Sets up the global navigation guards.
 * We call this function from `main.js` after Pinia and Firebase have initialized.
 */
export function setupNavigationGuards() {
  const authStore = useAuthStore();

  // ======================================================
  // ✨ NEW: Helper function to wait for auth to be ready
  // ======================================================
  function waitForAuthInit() {
    // If loading is already false, we're good to go
    if (!authStore.loading) {
      return Promise.resolve();
    }
    // Otherwise, watch the 'loading' state and resolve the promise
    // once it turns false.
    return new Promise(resolve => {
      const unwatch = watch(() => authStore.loading, (isLoading) => {
        if (!isLoading) {
          unwatch(); // Clean up the watcher
          resolve();
        }
      });
    });
  }

  router.beforeEach(async (to, from, next) => { // 👈 Make the guard async
    // ======================================================
    // ✨ NEW: Wait for the initial check to complete
    // ======================================================
    await waitForAuthInit();

    const requiresAuth = to.meta.requiresAuth;
    const guestOnly = to.meta.guestOnly;
    const isAuthenticated = authStore.isAuthenticated;

    if (requiresAuth && !isAuthenticated) {
      console.log(`Guard: Redirecting to sign-in from ${to.fullPath}`);
      next({
        name: 'SignIn',
        query: { redirect: to.fullPath }
      });
    } else if (guestOnly && isAuthenticated) {
      console.log('Guard: Redirecting to home from guest-only page');
      next({ name: 'Home' });
    } else {
      next();
    }
  });
}

/**
 * Programmatically navigates to the error page with details.
 * This is useful for catching errors outside of navigation (e.g., in API calls).
 */
export function navigateToError(error = {}) {
  // Enhanced error data extraction
  const errorData = {
    code: error.code || error.statusCode || 500,
    message: error.message || 'An unexpected error occurred',
    error: error.name || 'UNKNOWN_ERROR',
  };

  if (import.meta.env.DEV) {
    errorData.details = error.details || error.stack;
  }
  // Persist full error object in sessionStorage so the Error page can show stacks without huge query strings
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('libra:lastError', JSON.stringify(error));
    }
  } catch (e) {
    // ignore sessionStorage errors
  }

  return router.push({
    name: 'Error',
    query: errorData
  });
}

// --- Error Handling ---

// This hook catches errors from async navigation guards or router.push() rejections.
router.onError(error => {
  console.error("Router Error:", error);
  
  // Ignore benign errors like duplicate navigation
  if (error.name === 'NavigationDuplicated' || error.message.includes('redundant navigation')) {
    return;
  }
  
  // Redirect to a specific error page for more serious navigation failures
  navigateToError(error);
});


// --- Exports ---
export default router;