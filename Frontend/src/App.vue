<script setup>
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <Navbar />

    <main class="flex-1 overflow-y-auto p-4 pt-20">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" class="h-full" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style>
/* Note: Global styles like these are best placed in your main CSS file (e.g., src/main.css),
  but are included here for completeness.
*/
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Smooth transitions between routes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>