<script setup>
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="h-screen flex flex-col bg-sunset-800">
    <Navbar />

    <main class="flex-1 overflow-y-auto md:pt-16 pb-16 md:pb-0">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style>
/* No changes needed here */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>