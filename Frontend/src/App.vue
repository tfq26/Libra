<template>
  <div id="app" class="min-h-screen bg-sunset-800">
    <Toast />
    <Navbar />
    <main class="container mx-auto px-4 py-8">
      <router-view v-slot="{ Component: PageComponent }">
        <transition name="fade" mode="out-in">
          <component :is="PageComponent" v-if="PageComponent" :key="$route.fullPath" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import Toast from 'primevue/toast'; // <-- This import was missing
</script>

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