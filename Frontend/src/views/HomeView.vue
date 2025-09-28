<template>
  <div class="min-h-screen flex flex-col bg-platinum-100 dark:bg-eerie_black-900 transition-colors duration-500">
    <main class="flex-grow container mx-auto py-16 px-6 sm:px-8">
      <div class="max-w-5xl mx-auto text-center animate-in fade-in slide-in-from-top-4 duration-1000">
        <h2 class="text-5xl md:text-6xl font-extrabold text-eerie_black-500 dark:text-platinum-500 mb-6 leading-tight">
          Your AI-Powered Financial Assistant
        </h2>
        <p class="text-xl md:text-2xl text-eerie_black-400 dark:text-platinum-300 mb-10">
          Get insights, track expenses, and manage your finances with the power of AI.
        </p>

        <router-link
          to="/chat"
          class="inline-flex items-center justify-center bg-saffron-500 hover:bg-saffron-600 text-eerie_black-500 font-bold py-4 px-10 rounded-full transition-all duration-300 text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Start Chatting
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ml-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </router-link>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
        <div class="bg-platinum-500 dark:bg-jet-500 rounded-2xl shadow-lg border border-platinum-400 dark:border-jet-400 p-8 transition-all duration-300 hover:shadow-2xl hover:border-saffron-500 hover:-translate-y-2 animate-in fade-in-from-bottom-2 delay-200">
          <div class="w-16 h-16 bg-saffron-500/10 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-saffron-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-eerie_black-500 dark:text-platinum-500 mb-2">AI Chat</h3>
          <p class="text-eerie_black-400 dark:text-platinum-300">Chat with our AI assistant to get personalized financial advice and insights.</p>
        </div>

        <div class="bg-platinum-500 dark:bg-jet-500 rounded-2xl shadow-lg border border-platinum-400 dark:border-jet-400 p-8 transition-all duration-300 hover:shadow-2xl hover:border-saffron-500 hover:-translate-y-2 animate-in fade-in-from-bottom-2 delay-400">
          <div class="w-16 h-16 bg-saffron-500/10 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-saffron-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-eerie_black-500 dark:text-platinum-500 mb-2">Expense Tracking</h3>
          <p class="text-eerie_black-400 dark:text-platinum-300">Easily track and categorize your expenses with smart suggestions.</p>
        </div>

        <div class="bg-platinum-500 dark:bg-jet-500 rounded-2xl shadow-lg border border-platinum-400 dark:border-jet-400 p-8 transition-all duration-300 hover:shadow-2xl hover:border-saffron-500 hover:-translate-y-2 animate-in fade-in-from-bottom-2 delay-600">
          <div class="w-16 h-16 bg-saffron-500/10 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-saffron-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-eerie_black-500 dark:text-platinum-500 mb-2">Insights</h3>
          <p class="text-eerie_black-400 dark:text-platinum-300">Get valuable insights and trends about your spending habits.</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
// Component logic goes here
</script>
