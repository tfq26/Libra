import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth'; // 👈 Import the auth store

// --- Component Imports ---
import Home from '../pages/Home.vue';
import Chat from '../pages/Chat.vue';
import History from '../pages/History.vue';
import SignIn from '../pages/Sign-in.vue';
import SignUp from '../pages/Sign-up.vue';
import ErrorPage from '../pages/Error.vue';

// --- Route Definitions ---
export const routes = [
  { path: '/', name: 'Home', component: Home, exact: true }, // Added 'exact: true' for clarity
  { path: '/chat', name: 'Chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/chat/:id', name: 'ChatSession', component: Chat, meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: History, meta: { requiresAuth: true } },
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
  const authStore = useAuthStore(); // Instantiated here, safe if called after Pinia is set up

  router.beforeEach((to, from, next) => {
    const requiresAuth = to.meta.requiresAuth;
    const guestOnly = to.meta.guestOnly;
    const isAuthenticated = authStore.isAuthenticated;

    if (requiresAuth && !isAuthenticated) {
      // ❗️ User tries to access a protected page but is not logged in.
      // Redirect to the sign-in page, saving their intended destination.
      console.log(`Guard: Redirecting to sign-in from ${to.fullPath}`);
      next({
        name: 'SignIn',
        query: { redirect: to.fullPath } // Save the intended path
      });
    } else if (guestOnly && isAuthenticated) {
      // ❗️ User is logged in but tries to access a guest-only page (like sign-in/sign-up).
      // Redirect them to the home page or dashboard.
      console.log('Guard: Redirecting to home from guest-only page');
      next({ name: 'Home' }); // You might change this to 'Dashboard' if you have one
    } else {
      // ✅ All good, proceed to the page.
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