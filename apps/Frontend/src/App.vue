<template>
  <div id="app" class="flex flex-col h-screen bg-sunset-900 dark:bg-stone-900 
  min-h-[calc(100vh-4rem)] transition-colors duration-300 custom-scrollbar">
    <Toast position="top-center" autoZIndex />
    <Navbar />

    <main class="flex-grow overflow-y-auto p-4"> 
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
import Toast from 'primevue/toast';
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