import { defineStore } from 'pinia';
import { auth } from '../firebase/config'; // Make sure this path is correct
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onIdTokenChanged // The recommended listener for handling tokens
} from 'firebase/auth';

export const useAuthStore = defineStore('auth', {
  // ======================================================
  // STATE ✨
  // ======================================================
  state: () => ({
    user: null,
    token: null, // We will now store the token directly in the state
    loading: true, // Start in a loading state until the first auth check is complete
  }),

  // ======================================================
  // GETTERS 🤸
  // ======================================================
  getters: {
    isAuthenticated: (state) => !!state.user,
    userId: (state) => state.user?.uid || null,
  },

  // ======================================================
  // ACTIONS 🚀
  // ======================================================
  actions: {
    /**
     * This is the core of the auth store. It sets up a persistent listener
     * that automatically updates the user and token state. It runs once
     * when the app starts and stays active.
     */
    initializeAuthListener() {
      onIdTokenChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // User is signed in or token has been refreshed
          this.user = firebaseUser;
          this.token = await firebaseUser.getIdToken();
        } else {
          // User is signed out
          this.user = null;
          this.token = null;
        }
        this.loading = false; // Auth state is now resolved
      });
    },

    /**
     * Gets the current user's JWT, forcing a refresh if it's expired.
     * This is the safest way to get a token before an API call.
     */
    async getToken() {
      if (auth.currentUser) {
        // The 'true' argument forces a refresh if the token is about to expire
        return await auth.currentUser.getIdToken(true);
      }
      return null;
    },

    async login(email, password) {
      // The onIdTokenChanged listener will automatically update the state
      await signInWithEmailAndPassword(auth, email, password);
    },

    async register(email, password) {
      // The listener will also handle this state update
      await createUserWithEmailAndPassword(auth, email, password);
    },



    async logout() {
      // The listener will set user and token to null
      await signOut(auth);
    },
  },
});