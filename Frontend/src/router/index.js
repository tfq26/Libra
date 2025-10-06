import { createRouter, createWebHistory } from 'vue-router';

// --- Component Imports ---
import Home from '../pages/Home.vue';
import Chat from '../pages/Chat.vue';
import History from '../pages/History.vue';
import SignIn from '../pages/Sign-in.vue';
import SignUp from '../pages/Sign-up.vue';
import ErrorPage from '../pages/Error.vue'; // Renamed to avoid conflict with native Error

// --- Route Definitions ---
export const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/conversation', name: 'Chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/conversation/:id', name: 'ChatSession', component: Chat, meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: History, meta: { requiresAuth: true } },
  { path: '/sign-in', name: 'SignIn', component: SignIn, meta: { guestOnly: true } },
  { path: '/sign-up', name: 'SignUp', component: SignUp, meta: { guestOnly: true } },
  {
    path: '/error',
    name: 'Error',
    component: ErrorPage,
    props: true // Let router pass query params as props automatically
  },
  // 404 Catch-all
  {
    path: '/:pathMatch(.*)*',
    redirect: to => ({
      path: '/error',
      query: { code: '404', message: `Page not found: ${to.path}`, error: 'NOT_FOUND' }
    })
  }
];

// --- Router Instance ---
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }), // Simplified scroll behavior
});

// --- Helper Functions ---

/**
 * Programmatically navigates to the error page with details.
 * This is useful for catching errors outside of navigation (e.g., in API calls).
 */
export function navigateToError(error = {}) {
  return router.push({
    name: 'Error',
    query: {
      code: error.code || error.statusCode || 500,
      message: error.message || 'An unexpected error occurred',
      error: error.name || 'UNKNOWN_ERROR',
      details: import.meta.env.DEV ? (error.details || error.stack) : undefined
    }
  });
}

// --- Error Handling ---

// This hook catches errors from async navigation guards or router.push() rejections.
// It's the primary way to handle router-specific errors.
router.onError(error => {
  console.error("Router Error:", error);
  // Don't redirect if it's a benign error we want to ignore
  if (error.name === 'NavigationDuplicated') {
    return;
  }
  navigateToError(error);
});


// --- Exports ---
export default router;