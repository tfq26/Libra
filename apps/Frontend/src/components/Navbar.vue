<template>
  <div>
    <div class="hidden md:flex fixed top-6 right-6 z-50 flex-row items-center space-x-3">
      <Button
        icon="pi pi-home"
        :class="{ 'p-button-warning': route.path === '/', 'p-button-secondary': route.path !== '/', 'p-button-rounded p-button-icon-only p-button-lg': true }"
        v-tooltip.left="'Home'"
        @click="router.push('/')"
      />
      <Button
        icon="pi pi-comment"
        :class="{ 'p-button-warning': route.path.startsWith('/chat'), 'p-button-secondary': !route.path.startsWith('/chat'), 'p-button-rounded p-button-icon-only p-button-lg': true }"
        v-tooltip.left="'Chat'"
        @click="router.push('/chat')"
      />
      <Button
        icon="pi pi-book"
        :class="{ 'p-button-warning': route.path.startsWith('/history'), 'p-button-secondary': !route.path.startsWith('/history'), 'p-button-rounded p-button-icon-only p-button-lg': true }"
        v-tooltip.left="'History'"
        @click="router.push('/history')"
      />
      <template v-if="!authStore.loading">
        <div
          class="cursor-pointer"
          :class="{ 'bg-primary text-white rounded-full flex items-center justify-center': authStore.isAuthenticated, 'bg-gray-300 text-gray-700 rounded-full flex items-center justify-center': !authStore.isAuthenticated }"
          style="width:48px; height:48px;"
          role="button"
          aria-haspopup="true"
          aria-controls="profile_menu"
          v-tooltip.left="'Account'"
          @click="toggleProfileMenu"
        >
          <!-- Show preloaded image when available -->
          <img v-if="imageLoaded && authStore.userPhotoUrl" :src="authStore.userPhotoUrl" alt="avatar" class="w-full h-full object-cover rounded-full" />

          <!-- If image failed or not present, show initials or icon -->
          <span v-else class="text-lg font-semibold">
            <template v-if="initials">{{ initials }}</template>
            <template v-else>
              <i class="pi pi-user text-xl"></i>
            </template>
          </span>
        </div>
      </template>
    </div>

    <div class="md:hidden fixed top-4 right-4 z-50">
      <Button
        :icon="isNavOpen ? 'pi pi-times' : 'pi pi-bars'"
        class="p-button-rounded p-button-lg"
        @click="isNavOpen = !isNavOpen"
        aria-label="Toggle navigation menu"
      />
      
      <transition name="fade-down">
        <div v-if="isNavOpen" class="absolute top-14 right-0 w-48 bg-timberwolf-100 rounded-md shadow-lg p-2 flex flex-col gap-1">
          <Button label="Home" icon="pi pi-home" class="p-button-text text-white justify-start" @click="navigateTo('/')" />
          <Button label="Chat" icon="pi pi-comment" class="p-button-text text-white justify-start" @click="navigateTo('/chat')" />
          <Button label="History" icon="pi pi-book" class="p-button-text text-white justify-start" @click="navigateTo('/history')" />
          <div class="border-t border-gray-700 my-1"></div>
          <template v-if="!authStore.loading">
            <Button
              v-if="authStore.isAuthenticated"
              label="Account"
              icon="pi pi-user"
              class="p-button-text text-white justify-start"
              @click="toggleProfileMenu"
              aria-haspopup="true"
              aria-controls="profile_menu"
            />
            <Button
              v-else
              label="Sign In"
              icon="pi pi-sign-in"
              class="p-button-text text-white justify-start"
              @click="navigateTo('/sign-in')"
            />
          </template>
        </div>
      </transition>
    </div>

    <Menu ref="profileMenu" id="profile_menu" :model="profileMenuItems" :popup="true" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'; // Import computed
import { useRoute, useRouter } from 'vue-router';
import 'primeicons/primeicons.css';
import { useAuthStore } from '../stores/auth';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar'; // Added Avatar
import Menu from 'primevue/menu';     // Added Menu
import { useToast } from 'primevue/usetoast';

// v-tooltip is a directive and must be registered globally in your main.js/main.ts
// like this: app.directive('tooltip', Tooltip);
// You'll also need: import Tooltip from 'primevue/tooltip'; in main.js

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const isNavOpen = ref(false);
const profileMenu = ref(); // Ref for the popover menu

// Avatar image preload state
const imageLoaded = ref(false);
const imageError = ref(false);

const initials = computed(() => {
  const user = authStore.user || {};
  const name = user.displayName || user.name || user.email || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});

// Preload helper
function preloadImage(url) {
  imageLoaded.value = false;
  imageError.value = false;
  if (!url) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageLoaded.value = true;
      imageError.value = false;
      resolve(true);
    };
    img.onerror = () => {
      imageLoaded.value = false;
      imageError.value = true;
      resolve(false);
    };
    img.src = url;
  });
}

// Watch for changes to the user's photo URL and preload when it changes
watch(
  () => authStore.userPhotoUrl,
  (url) => {
    preloadImage(url).catch(() => {});
  },
  { immediate: true }
);

const handleLogout = async () => {
  isNavOpen.value = false;
  await authStore.logout();
  router.push('/');
};

function navigateTo(path) {
  router.push(path);
  isNavOpen.value = false;
}

// Toggles the popover menu
const toggleProfileMenu = (event) => {
  // Menu component expects a ref with toggle method. Guard against missing ref.
  if (profileMenu.value && typeof profileMenu.value.toggle === 'function') {
    profileMenu.value.toggle(event);
  }
};

// Defines the items in the popover menu based on auth state
const profileMenuItems = computed(() => {
  if (authStore.isAuthenticated) {
    return [
      {
        label: localStorage.getItem('libra:autoRestoreDrafts') === 'false' ? 'Enable Auto-Restore Drafts' : 'Disable Auto-Restore Drafts',
        icon: 'pi pi-refresh',
        command: () => {
          try {
            const cur = localStorage.getItem('libra:autoRestoreDrafts');
            const next = cur === 'false' ? 'true' : 'false';
            localStorage.setItem('libra:autoRestoreDrafts', next);
            toast.add({ severity: 'success', summary: 'Preference saved', detail: next === 'true' ? 'Auto-restore enabled' : 'Auto-restore disabled' });
          } catch (e) {
            console.warn('Could not toggle auto-restore setting', e.message || e);
          }
        }
      },
      {
        label: 'Sign Out',
        icon: 'pi pi-sign-out',
        command: handleLogout // Use existing logout function
      }
    ];
  } else {
    return [
      {
        label: 'Sign In',
        icon: 'pi pi-sign-in',
        command: () => {
          navigateTo('/sign-in'); // Use existing navigation function
        }
      }
    ];
  }
});
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

/* Optional: Style the avatar to match button sizes if needed */
/* 'size="large"' on Avatar component usually works well */
</style>