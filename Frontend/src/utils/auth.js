import { ref, computed, watchEffect } from 'vue';
import { useAuth as useClerkAuth, useSession } from '@clerk/vue';

// Use a local state object to mirror and control the reactive values
const authState = ref({
  isLoaded: false,
  isSignedIn: false,
  userId: null,
  user: null,
  token: null,
});

export function useAuth() {
  // 🔑 CRITICAL FIX 1: Destructure properties from Clerk's hooks.
  // These properties are Vue Refs when used inside <script setup> or a composable.
  const clerkAuth = useClerkAuth();
  const clerkSession = useSession(); // useSession returns { session: Ref<Session> }

  // Use optional chaining for safety, but rely on the .value of the Refs below
  const { 
    isLoaded, 
    isSignedIn, 
    userId, 
    user, 
    getToken: clerkGetToken // getToken is a Ref that holds the actual async function
  } = clerkAuth || {};
  
  // ----------------------------------------------------------------
  // Stable Token Retrieval (Called internally and exported)
  // ----------------------------------------------------------------
  const safeGetToken = async (maxRetries = 3, delay = 200) => {
    // 🔑 FIX 2: Check if the token function exists AND is callable
    const tokenFunction = clerkGetToken?.value; 

    if (!isSignedIn?.value || typeof tokenFunction !== 'function') {
      // If signed out or function is not ready, exit gracefully.
      return null;
    }

    // Get token with retry logic
    for (let i = 0; i < maxRetries; i++) {
      try {
        // 🔑 FIX 3: Call the function that is inside the Ref
        const token = await tokenFunction();
        if (token) return token;
      } catch (e) {
        console.warn(`Token fetch attempt ${i + 1} failed (Retrying):`, e);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    
    console.error('safeGetToken: Failed to obtain token after retries.');
    return null;
  };
  
  // ----------------------------------------------------------------
  // State Updater (Synchronizes Clerk Refs with local computed state)
  // ----------------------------------------------------------------
  const updateAuthState = async () => {
    // 🔑 FIX 4: Correctly access the .value of Clerk's Refs.
    const loaded = isLoaded?.value || false;
    const signedIn = isSignedIn?.value || false;
    
    // Only proceed if Clerk has completed its initial load
    if (!loaded) {
      authState.value = { isLoaded: false, isSignedIn: false, userId: null, user: null, token: null };
      return;
    }

    const token = signedIn ? await safeGetToken() : null;
    
    authState.value = {
      isLoaded: loaded,
      isSignedIn: signedIn,
      userId: userId?.value || null,
      user: user?.value || null,
      token,
    };
  };

  // Watch for ANY changes in Clerk's reactive state to trigger a sync
  watchEffect(() => {
    // List all reactive dependencies being tracked
    const deps = [
        isLoaded?.value, 
        isSignedIn?.value, 
        userId?.value, 
        clerkGetToken?.value // Crucial for tracking when the function is attached
    ];
    
    // De-bounce the update slightly, but ensure it runs when state changes
    if (deps.some(dep => dep !== undefined)) {
        updateAuthState();
    }
  });

  // ----------------------------------------------------------------
  // Exported Interface
  // ----------------------------------------------------------------
  return {
    isLoaded: computed(() => authState.value.isLoaded),
    isSignedIn: computed(() => authState.value.isSignedIn),
    userId: computed(() => authState.value.userId),
    user: computed(() => authState.value.user),
    token: computed(() => authState.value.token),
    
    // Export the safe wrapper function for external calls
    getAuthToken: safeGetToken,
    
    refreshAuth: updateAuthState,
  };
}

// ----------------------------------------------------------------
// Route Guard & Helper (Cleaned up for robustness)
// ----------------------------------------------------------------

// Note: The route guard now relies on the computed 'isLoaded' state from useAuth()
export function requireAuth(to, from, next) {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded.value) {
    const unwatch = watchEffect(() => {
      if (isLoaded.value) {
        unwatch();
        if (!isSignedIn.value) {
          next({ name: 'SignIn', query: { redirect: to.fullPath } });
        } else {
          next();
        }
      }
    });
  } else if (!isSignedIn.value) {
    next({ name: 'SignIn', query: { redirect: to.fullPath } });
  } else {
    next();
  }
}

// Helper for authenticated API calls (Optional, but often cleaner in components)
export async function withAuth(fetchFunction) {
  const { isSignedIn, getAuthToken } = useAuth(); // Use new function name
  
  if (!isSignedIn.value) {
    throw new Error('Authentication required');
  }
  
  const token = await getAuthToken(); // Use the stable function
  if (!token) {
    throw new Error('Failed to get authentication token');
  }
  
  return fetchFunction(token);
}