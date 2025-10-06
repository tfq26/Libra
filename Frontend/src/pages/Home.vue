<template>
  <div class="flex w-full items-center justify-center py-12 px-4">
    <div class="flex w-full max-w-screen-lg flex-col items-center justify-center text-center">
      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <img 
          src="../assets/libra-svgrepo-com-light.svg" 
          alt="Libra Logo" 
          class="h-16 w-16 mb-6 hover:animate-pulse transition-transform duration-300 hover:scale-110 dark:text-lion-400"
        />
      </transition>

      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out delay-100"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 text-lion-400 dark:text-lion-400">
          {{ greeting }}
        </h1>
      </transition>

      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out delay-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <p class="text-base sm:text-lg md:text-xl mb-10 leading-relaxed text-timberwolf-700 dark:text-timberwolf-200">
          Your intelligent assistant for all your technical support needs. Get help with your issues quickly and efficiently.
        </p>
      </transition>

      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out delay-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <div class="flex w-full flex-col justify-center space-y-4 sm:w-auto sm:flex-row sm:space-y-0 sm:space-x-4">
          <router-link 
            to="/chat" 
            class="inline-block w-full sm:w-auto transform rounded-lg bg-lion-600 px-8 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-sunset-300 hover:shadow-xl"
          >
            Start Chatting Now
          </router-link>
          <a 
            href="#" 
            class="inline-block w-full sm:w-auto transform rounded-lg border border-gray-300 bg-white px-8 py-3 font-medium text-gray-800 transition-all duration-300 hover:scale-105 hover:bg-gray-100 hover:shadow-md"
          >
            Read Documentation
          </a>
        </div>
      </transition>

      <div class="mt-16 w-full sm:mt-24">
        <div class="grid grid-cols-1 gap-8 text-left md:grid-cols-3">
          <transition
            v-for="(feature, index) in features"
            :key="feature.title"
            appear
            :enter-active-class="`transition-opacity duration-500 ease-out delay-${(index * 100) + 400}`"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
          >
            <div class="transform rounded-xl border border-lion-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div class="mb-3 text-lion-500">
                <i :class="feature.icon" class="flex h-8 w-8 items-center justify-center text-3xl"></i>
              </div>
              <h3 class="text-xl text-sunset-300 font-semibold mb-2">{{ feature.title }}</h3>
              <p class="text-gray-600">{{ feature.description }}</p>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// No changes needed in the script block
import { ref, onMounted } from 'vue';
import 'primeicons/primeicons.css'

const greeting = ref('Hello, from Libra!');
const greetings = [
  'Hello, from Libra!',
  'Libra, Online!',
  'Gear 4th: Libra!',
  'Libra, my AI way!',
  'Libra, Roll Out!',
  'Fixed, thats Libra!',
  '01001000 01101100 - Libra!'
];

const features = [
  {
    title: 'Fast Responses',
    description: 'Get instant answers to your technical questions 24/7.',
    icon: 'pi pi-clock'
  },
  {
    title: 'Secure & Private',
    description: 'Your conversations are encrypted and kept confidential.',
    icon: 'pi pi-lock'
  },
  {
    title: 'Expert Knowledge',
    description: 'Powered by advanced AI with deep technical expertise.',
    icon: 'pi pi-book'
  }
];

onMounted(() => {
  const randomIndex = Math.floor(Math.random() * greetings.length);
  greeting.value = greetings[randomIndex];
});
</script>

<style scoped>
/* No changes needed in the style block */
.transition-opacity {
  transition-property: opacity;
}
.delay-100 { transition-delay: 100ms; }
.delay-200 { transition-delay: 200ms; }
.delay-300 { transition-delay: 300ms; }
.delay-400 { transition-delay: 400ms; }
.delay-500 { transition-delay: 500ms; }
.delay-600 { transition-delay: 600ms; }
.delay-700 { transition-delay: 700ms; }
</style>