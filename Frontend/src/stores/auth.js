// stores/auth.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from '../firebase/config'; // Make sure this path is correct

export const useAuthStore = defineStore('auth', () => {
  // ======================================================
  // STATE ✨
  // ======================================================
  const user = ref(null);
  const loading = ref(true); // Start as true to handle initial auth check
  const error = ref(null);

  /**
   * This is the core of the auth store. It sets up a real-time listener
   * to Firebase's authentication state. It automatically updates the `user`
   * state whenever a user logs in, logs out, or when the page is reloaded.
   */
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
    loading.value = false;
  });

  // ======================================================
  // GETTERS 🤸 (as computed properties)
  // ======================================================
  const isAuthenticated = computed(() => !!user.value);
  const userId = computed(() => user.value?.uid);

  // ======================================================
  // ACTIONS 🚀
  // ======================================================

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      user.value = userCredential.user; // State is updated by onAuthStateChanged, but this is faster
      return { success: true, user: userCredential.user };
    } catch (err) {
      error.value = err.message; // Store a user-friendly error message
      return { success: false, error: err.message };
    } finally {
      loading.value = false;
    }
  };

  const register = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user.value = userCredential.user;
      return { success: true, user: userCredential.user };
    } catch (err) {
      error.value = err.message;
      return { success: false, error: err.message };
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    loading.value = true;
    error.value = null;
    try {
      await signOut(auth);
      // user.value will be set to null automatically by onAuthStateChanged
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Gets the current user's JWT token.
   * This is essential for authenticating requests to your backend API.
   */
  const getToken = async () => {
    if (!user.value) {
      return null;
    }
    return await user.value.getIdToken();
  };

  // The 'unsubscribe' function can be called to clean up the listener,
  // but for a global auth store, this is rarely needed.

  return {
    // State
    user,
    loading,
    error,
    // Getters
    isAuthenticated,
    userId,
    // Actions
    login,
    register,
    logout,
    getToken
  };
});