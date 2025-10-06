<template>
  <div id="app" class="h-screen flex flex-col font-inter antialiased bg-gray-50 dark:bg-ochre-900 text-gray-900 dark:text-gray-50">
    <Navbar />
    <main class="flex-1 overflow-y-auto md:pt-16 pb-16 md:pb-0">
      <!-- Use router-view directly without v-slot for simpler setup -->
      <router-view v-slot="{ Component: PageComponent }">
        <transition name="fade" mode="out-in">
          <component :is="PageComponent" v-if="PageComponent" :key="$route.fullPath" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import Navbar from './components/Navbar.vue';

export default defineComponent({
  name: 'App',
  components: {
    Navbar
  }
});
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
