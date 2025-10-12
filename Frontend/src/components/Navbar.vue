<template>
  <div>
    <div class="hidden md:flex fixed top-6 right-6 z-50 flex-row items-center space-x-3">
      <Button
        icon="pi pi-home"
        :class="{ 'p-button-warning': route.path === '/', 'p-button-secondary': route.path !== '/', 'p-button-rounded p-button-icon-only p-button-lg': true }"
        title="Home"
        @click="router.push('/')"
      />
      <Button
        icon="pi pi-comment"
        :class="{ 'p-button-warning': route.path.startsWith('/chat'), 'p-button-secondary': !route.path.startsWith('/chat'), 'p-button-rounded p-button-icon-only p-button-lg': true }"
        title="Chat"
        @click="router.push('/chat')"
      />
      <Button
        icon="pi pi-book"
        :class="{ 'p-button-warning': route.path.startsWith('/history'), 'p-button-secondary': !route.path.startsWith('/history'), 'p-button-rounded p-button-icon-only p-button-lg': true }"
        title="History"
        @click="router.push('/history')"
      />
      <template v-if="!authStore.loading">
        <Button
          v-if="authStore.isAuthenticated"
          icon="pi pi-sign-out"
          class="p-button-rounded p-button-icon-only p-button-lg p-button-secondary"
          title="Sign Out"
          @click="handleLogout"
        />
        <Button
          v-else
          icon="pi pi-sign-in"
          :class="{ 'p-button-warning': route.path.startsWith('/sign-in'), 'p-button-secondary': !route.path.startsWith('/sign-in'), 'p-button-rounded p-button-icon-only p-button-lg': true }"
          title="Sign In"
          @click="router.push('/sign-in')"
        />
      </template>
    </div>

    <div class="md:hidden fixed top-4 right-4 z-50">
      <Button
        :icon="isNavOpen ? 'pi pi-times' : 'pi pi-bars'"
        class="p-button-rounded p-button-lg p-button-secondary"
        @click="isNavOpen = !isNavOpen"
        aria-label="Toggle navigation menu"
      />
      
      <transition name="fade-down">
        <div v-if="isNavOpen" class="absolute top-14 right-0 w-48 bg-gray-800 rounded-md shadow-lg p-2 flex flex-col gap-1">
          <Button label="Home" icon="pi pi-home" class="p-button-text text-white justify-start" @click="navigateTo('/')" />
          <Button label="Chat" icon="pi pi-comment" class="p-button-text text-white justify-start" @click="navigateTo('/chat')" />
          <Button label="History" icon="pi pi-book" class="p-button-text text-white justify-start" @click="navigateTo('/history')" />
          <div class="border-t border-gray-700 my-1"></div>
          <template v-if="!authStore.loading">
            <Button v-if="authStore.isAuthenticated" label="Sign Out" icon="pi pi-sign-out" class="p-button-text text-white justify-start" @click="handleLogout" />
            <Button v-else label="Sign In" icon="pi pi-user" class="p-button-text text-white justify-start" @click="navigateTo('/sign-in')" />
          </template>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import 'primeicons/primeicons.css';
import { useAuthStore } from '../stores/auth';
import Button from 'primevue/button';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const isNavOpen = ref(false);

const handleLogout = async () => {
  isNavOpen.value = false;
  await authStore.logout();
  router.push('/');
};

function navigateTo(path) {
  router.push(path);
  isNavOpen.value = false;
}
</script>

<style scoped>
/* Transition for the dropdown menu */
.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.2s ease-out;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>