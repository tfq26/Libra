<template>
    <div class="grid md:grid-cols-2 min-h-screen text-ochre-600">
  
      <div class="hidden md:flex flex-col items-start justify-center p-16">
        <img
          src="../assets/libra-svgrepo-com-light.svg"
          alt="Libra Logo"
          class="h-20 w-20 mb-8"
        />
        <h1 class="text-5xl font-extrabold mb-4 leading-tight text-lion-400">
          Welcome to Libra Chat
        </h1>
        <p class="text-lg opacity-90 mb-8">
          Your secure and intelligent conversation platform. Connect, learn, and create with the power of AI.
        </p>
        <router-link to="/" class="px-6 py-3 bg-white text-blue-800 dark:bg-sunset-200 dark:text-sunset-900 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors duration-300">
          Learn More
        </router-link>
      </div>
  
      <div class="flex flex-col items-center justify-center p-8">
        <div class="w-full max-w-md p-8 rounded-xl shadow-2xl bg-white dark:bg-lion-700 border border-lion-900 dark:border-sunset-100">
  
          <div class="flex flex-col items-center mb-6 md:hidden">
            <img
              src="../assets/libra-svgrepo-com-light.svg"
              alt="Libra Logo"
              class="h-12 w-12 mb-4 text-lion-400"
            />
            <h2 class="text-3xl font-extrabold text-lion-400 dark:text-lion-400">
              Sign in to Libra
            </h2>
          </div>
  
          <h2 class="hidden md:block text-4xl font-extrabold mb-8 text-lion-400 dark:text-lion-400 text-center">
            Sign in to your account
          </h2>
  
          <SignIn
            path="/sign-in"
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
          <router-link to="/sign-up" class="mt-4 block text-center text-sm text-lion-600 hover:text-lion-700 dark:text-lion-400 dark:hover:text-lion-500 transition-colors">
            Don't have an account? Sign Up
          </router-link>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { SignIn } from '@clerk/vue';
  </script>
  
  <style scoped>
  /* You can define specific styles here if needed, but Tailwind handles most of it */
  </style>