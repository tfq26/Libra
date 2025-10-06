<template>
    <div class="flex w-full min-h-screen items-center justify-center py-12 px-4">
      <div class="flex w-full max-w-md flex-col items-center justify-center text-center p-8 rounded-xl shadow-2xl bg-white dark:bg-gray-800 border border-lion-100 dark:border-gray-700">
        <img 
          src="../assets/libra-svgrepo-com-light.svg" 
          alt="Libra Logo" 
          class="h-12 w-12 mb-6 text-lion-400"
        />
        <h2 class="text-3xl font-extrabold mb-8 text-lion-400 dark:text-lion-400">
          Join the Libra Community
        </h2>
        <!-- The Clerk SignUp component -->
        <SignUp 
          path="/sign-up"
          :appearance="{
              variables: {
                  colorPrimary: '#D89745', // Use a color close to lion-600
                  colorText: '#374151', 
                  colorTextOnPrimaryBackground: '#FFFFFF',
                  colorBackground: '#FFFFFF',
              },
              elements: {
                  card: 'shadow-none border-none bg-transparent',
                  formButtonPrimary: 'bg-lion-600 hover:bg-lion-700 text-white rounded-lg p-3 text-base font-medium transition-all duration-300',
                  headerTitle: 'text-2xl font-bold text-gray-800 dark:text-gray-100',
                  headerSubtitle: 'text-gray-600 dark:text-gray-300',
                  rootBox: 'w-full',
                  
              }
          }"
        />
        <router-link to="/sign-in" class="mt-4 text-sm text-lion-600 hover:text-lion-700 dark:text-lion-400 dark:hover:text-lion-500 transition-colors">
          Already have an account? Sign In
        </router-link>
      </div>
    </div>
  </template>
  
  <script setup>
  import { SignUp } from '@clerk/vue';
  </script>
  