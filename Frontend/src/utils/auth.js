import { ref, computed, watchEffect } from 'vue';
import { useAuth as useClerkAuth, useSession } from '@clerk/vue';

const authState = ref({
  isLoaded: false,
  isSignedIn: false,
  userId: null,
  user: null,
  token: null,
});

export function useAuth() {
  // Initialize with safe defaults
  const clerkAuth = useClerkAuth();
  const { session } = useSession();
  
  // Destructure with default values to prevent undefined errors
  const {
    isLoaded = ref(false),
    isSignedIn = ref(false),
    userId = ref(null),
    user = ref(null)
  } = clerkAuth || {};

  const safeGetToken = async (maxRetries = 3, delay = 200) => {
    try {
      // Check if session is available
      if (!session?.value) {
        console.warn('No active session');
        return null;
      }

      // Get token with retry logic
      for (let i = 0; i < maxRetries; i++) {
        try {
          const token = await session.value.getToken();
          if (token) return token;
        } catch (e) {
          console.warn(`Token fetch attempt ${i + 1} failed:`, e);
          if (i === maxRetries - 1) throw e;
        }
        await new Promise(r => setTimeout(r, delay));
      }
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const updateAuthState = async () => {
    try {
      // Only proceed if Clerk is loaded
      if (!isLoaded?.value) {
        authState.value = {
          isLoaded: false,
          isSignedIn: false,
          userId: null,
          user: null,
          token: null,
        };
        return;
      }

      // Get token if signed in
      const token = isSignedIn?.value ? await safeGetToken() : null;
      
      // Update auth state
      authState.value = {
        isLoaded: true,
        isSignedIn: isSignedIn?.value || false,
        userId: userId?.value || null,
        user: user?.value || null,
        token,
      };
    } catch (error) {
      console.error('Error updating auth state:', error);
      authState.value = {
        isLoaded: true, // Still mark as loaded even if there's an error
        isSignedIn: false,
        userId: null,
        user: null,
        token: null,
      };
    }
  };

  // Watch for auth changes
  watchEffect(() => {
    // Only update if Clerk is loaded
    if (isLoaded?.value) {
      updateAuthState();
    }
  });

  // Initial update
  updateAuthState();

  return {
    isLoaded: computed(() => authState.value.isLoaded),
    isSignedIn: computed(() => authState.value.isSignedIn),
    userId: computed(() => authState.value.userId),
    user: computed(() => authState.value.user),
    token: computed(() => authState.value.token),
    getToken: safeGetToken,
    refreshAuth: updateAuthState,
  };
}

// Route guard
export function requireAuth(to, from, next) {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded.value) {
    const unwatch = watchEffect(() => {
      if (isLoaded.value) {
        unwatch();
        if (!isSignedIn.value) {
          next({ name: 'sign-in', query: { redirect: to.fullPath } });
        } else {
          next();
        }
      }
    });
  } else if (!isSignedIn.value) {
    next({ name: 'sign-in', query: { redirect: to.fullPath } });
  } else {
    next();
  }
}

// Helper for authenticated API calls
export async function withAuth(fetchFunction) {
  const { isSignedIn, getToken } = useAuth();
  
  if (!isSignedIn.value) {
    throw new Error('Authentication required');
  }
  
  const token = await getToken().value;
  if (!token) {
    throw new Error('Failed to get authentication token');
  }
  
  return fetchFunction(token);
}