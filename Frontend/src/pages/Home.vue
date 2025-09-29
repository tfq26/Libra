<template>
  <div class="flex h-full items-center justify-center p-4">
    <div class="text-center max-w-4xl">
      <h1 class="text-4xl md:text-6xl font-extrabold mb-6 text-indigo-700">Welcome to Libra AI Support 🤖</h1>
      <p class="text-lg md:text-xl mb-10 text-gray-700 leading-relaxed">
        Your intelligent assistant for all your technical support needs. Get help with your issues quickly and efficiently.
      </p>
      <div class="space-y-4 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center">
        <router-link 
          to="/chat" 
          class="inline-block w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg"
        >
          Start Chatting Now
        </router-link>
        <a 
          href="#" 
          class="inline-block w-full sm:w-auto bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-8 rounded-lg border border-gray-300 transition duration-200 transform hover:scale-105"
        >
          Read Documentation
        </a>
      </div>
      
      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-100">
          <div class="text-indigo-500 mb-3">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Fast Responses</h3>
          <p class="text-gray-600">Get instant answers to your technical questions 24/7.</p>
        </div>
        
        <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-100">
          <div class="text-indigo-500 mb-3">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Secure & Private</h3>
          <p class="text-gray-600">Your conversations are encrypted and kept confidential.</p>
        </div>
        
        <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-100">
          <div class="text-indigo-500 mb-3">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Expert Knowledge</h3>
          <p class="text-gray-600">Powered by advanced AI with deep technical expertise.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// No specific logic needed here for the static page
</script>