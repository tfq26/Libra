<template>
  <div class="p-4 md:p-32 flex w-full items-center justify-center">
    <div class="flex w-full max-w-screen-lg flex-col items-center justify-center text-center my-10">
      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <i
          class="pi pi-balance-scale text-6xl mb-6 text-yellow-500 hover:animate-pulse transition-transform duration-300 hover:scale-110"
        ></i>
      </transition>

      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out delay-100"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 text-yellow-500">
          {{ greeting }}
        </h1>
      </transition>

      <transition
        appear
        enter-active-class="transition-opacity duration-1000 ease-out delay-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <p class="text-base sm:text-lg md:text-xl mb-10 leading-relaxed text-gray-700 dark:text-gray-300">
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
          <Button
            label="Start Chatting Now"
            icon="pi pi-send"
            class="p-button-warning p-button-lg w-full sm:w-auto"
            @click="$router.push('/chat')"
          />
          <Button
            label="Read Documentation"
            icon="pi pi-file-o"
            class="p-button-secondary p-button-lg p-button-outlined w-full sm:w-auto"
            @click="readDocumentation"
          />
        </div>
      </transition>

      <Divider class="mt-16 sm:mt-24 w-full" />

      <div class="w-full">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <transition
            v-for="(feature, index) in features"
            :key="feature.title"
            appear
            :enter-active-class="`transition-opacity duration-500 ease-out delay-${(index * 100) + 400}`"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
          >
            <Card class="transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl p-card-shadow-sm">
              <template #content>
                <div class="mb-3 text-yellow-500">
                  <i :class="feature.icon" class="text-3xl"></i>
                </div>
                <h3 class="text-xl text-orange-500 font-semibold mb-2">{{ feature.title }}</h3>
                <p class="text-gray-600">{{ feature.description }}</p>
              </template>
            </Card>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import 'primeicons/primeicons.css'; // Already present, important for icons

// Component logic remains mostly the same
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

// Placeholder function for the link
const readDocumentation = () => {
  // In a real application, this would navigate or open a new tab
  console.log('Navigating to documentation...');
  window.location.href = '#';
};
</script>

<style scoped>
/* PrimeVue often relies on its own component styling and utility classes (like PrimeFlex/Tailwind)
   but we keep the custom transition delays for the entrance animation */
.transition-opacity {
  transition-property: opacity;
}
/* Custom delays remain for the Vue transitions */
.delay-100 { transition-delay: 100ms; }
.delay-200 { transition-delay: 200ms; }
.delay-300 { transition-delay: 300ms; }
.delay-400 { transition-delay: 400ms; }
.delay-500 { transition-delay: 500ms; }
.delay-600 { transition-delay: 600ms; }
.delay-700 { transition-delay: 700ms; }
</style>