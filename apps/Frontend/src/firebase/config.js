import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';

// Read Vite env vars (must be prefixed with VITE_ to be exposed to the client)
const env = import.meta.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Basic validation to catch missing/empty API key early with a helpful message.
// Firebase will otherwise raise a generic `auth/invalid-api-key` which is harder to debug.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === '') {
  const msg =
    'Firebase API key is missing or empty. Set VITE_FIREBASE_API_KEY in `apps/Frontend/.env` or your environment (see .env.example).';
  // Log and throw so the error surface is clear during development.
  // In production you might want to avoid throwing and instead disable auth features gracefully.
  // eslint-disable-next-line no-console
  console.error(msg);
  throw new Error(msg);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
};

// NOTE: Do NOT include firebase admin/service-account JSON in client-side code.
// The service account must live on the server (see `apps/Backend/secrets/firebase-service-account.json`) and
// server-side code should use the Firebase Admin SDK. Use `/api/admin-test` to verify server-side admin access.