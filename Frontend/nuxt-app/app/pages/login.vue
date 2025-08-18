<template>
  <div class="bg-eerie-black-500 min-h-screen flex items-center justify-center font-nunito">
    <UCard class="bg-eerie-black-400 border border-eerie-black-600 w-full max-w-md">
      <template #header>
        <h2 class="text-3xl font-bold text-center text-sunglow-400">
          Sign In to Libra
        </h2>
      </template>

      <div class="text-center">
        <p class="text-eerie-black-700 mb-8">
          Sign in with your account to continue.
        </p>

        <!-- This will be replaced by the actual user state later -->
        <div v-if="isAuthenticated">
          <p class="text-maize-400 mb-4">Welcome back!</p>
          <UButton
              label="Sign Out"
              size="lg"
              class="bg-bittersweet-500 hover:bg-bittersweet-400 text-white"
              block
              @click="handleSignOut"
          />
        </div>

        <div v-else>
          <UButton
              label="Sign In"
              size="lg"
              block
              class="bg-sandy-brown-500 hover:bg-sandy-brown-400 text-eerie-black-900"
              icon="i-heroicons-arrow-right-on-rectangle"
              @click="handleSignIn"
          />
        </div>
      </div>

    </UCard>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { PublicClientApplication } from '@azure/msal-browser';

// --- MSAL Configuration ---
// You will get these values from your App Registration in the Azure Portal
const msalConfig = {
  auth: {
    clientId: "e178fdb0-4a3a-4c5e-a3a3-2e4c42c8cb8a", // Application (client) ID
    authority: "https://taufeeq26outlook.ciamlogin.com/", // e.g., https://libraapp.ciamlogin.com/
    redirectUri: "http://localhost:3000", // Your app's URL
  },
  cache: {
    cacheLocation: "localStorage",
  },
};

const msalInstance = new PublicClientApplication(msalConfig);
const isAuthenticated = ref(false); // We will replace this with a Pinia store later

// --- Sign-In Logic ---
const handleSignIn = async () => {
  try {
    const loginRequest = {
      scopes: ["openid", "profile", "offline_access"],
    };
    const response = await msalInstance.loginPopup(loginRequest);
    console.log("Login successful!", response);
    isAuthenticated.value = true;
    // Here, we would save the user's info to our Pinia store
  } catch (error) {
    console.error("Login failed:", error);
  }
};

// --- Sign-Out Logic ---
const handleSignOut = async () => {
  try {
    await msalInstance.logoutPopup();
    isAuthenticated.value = false;
    // Here, we would clear the user's info from our Pinia store
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
</script>
