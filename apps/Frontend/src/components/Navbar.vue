<template>
  <div>
    <!-- Desktop Navigation -->
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
      <template v-if="!authStore.loading">
        <div
          class="cursor-pointer"
          :class="{ 'bg-primary text-white rounded-full flex items-center justify-center': authStore.isAuthenticated, 'bg-gray-300 text-gray-700 rounded-full flex items-center justify-center': !authStore.isAuthenticated }"
          style="width:48px; height:48px;"
          role="button"
          aria-haspopup="true"
          aria-controls="profile_menu"
          v-tooltip.left="'Profile'"
          @click="toggleProfileMenu($event)"
        >
          <!-- Show preloaded image when available -->
          <img
            v-if="imageLoaded && authStore.userPhotoUrl"
            :src="authStore.userPhotoUrl"
            alt="avatar"
            class="w-full h-full object-cover rounded-full"
            @error="() => { imageLoaded = false; imageError = true; }"
          />

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

    <!-- Mobile Hamburger Button -->
    <div class="md:hidden fixed top-4 right-4 z-50">
      <Button
        icon="pi pi-bars"
        class="p-button-rounded p-button-lg"
        @click="drawerVisible = true"
        aria-label="Open navigation menu"
      />
    </div>

    <!-- Mobile Drawer Navigation -->
    <Drawer v-model:visible="drawerVisible" position="right" class="w-80">
      <template #header>
        <div class="flex items-center gap-3">
          <i class="pi pi-bars text-2xl"></i>
          <span class="font-semibold text-xl">Menu</span>
        </div>
      </template>

      <div class="flex flex-col h-full">
        <!-- User Profile Section -->
        <div v-if="!authStore.loading" class="mb-6 pb-6 border-b border-surface-200 dark:border-surface-700">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="rounded-full flex items-center justify-center"
              :class="{ 'bg-primary text-white': authStore.isAuthenticated, 'bg-surface-200 text-surface-700': !authStore.isAuthenticated }"
              style="width:56px; height:56px;"
            >
              <img
                v-if="imageLoaded && authStore.userPhotoUrl"
                :src="authStore.userPhotoUrl"
                alt="avatar"
                class="w-full h-full object-cover rounded-full"
                @error="() => { imageLoaded = false; imageError = true; }"
              />
              <span v-else class="text-xl font-semibold">
                <template v-if="initials">{{ initials }}</template>
                <template v-else>
                  <i class="pi pi-user text-2xl"></i>
                </template>
              </span>
            </div>
            <div v-if="authStore.isAuthenticated" class="flex-1">
              <div class="font-semibold text-surface-900 dark:text-surface-0">
                {{ authStore.user?.displayName || authStore.user?.name || 'User' }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400 truncate">
                {{ authStore.user?.email }}
              </div>
            </div>
            <div v-else class="flex-1">
              <div class="text-surface-600 dark:text-surface-400">
                Not signed in
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 space-y-2">
          <Button
            label="Home"
            icon="pi pi-home"
            :class="{ 'bg-primary-subtle text-primary': route.path === '/' }"
            class="w-full justify-start"
            text
            @click="navigateTo('/')"
          />
          <Button
            label="Chat"
            icon="pi pi-comment"
            :class="{ 'bg-primary-subtle text-primary': route.path.startsWith('/chat') }"
            class="w-full justify-start"
            text
            @click="navigateTo('/chat')"
          />
          
          <template v-if="!authStore.loading">
            <Divider v-if="authStore.isAuthenticated" />
            
            <Button
              v-if="authStore.isAuthenticated"
              label="Profile"
              icon="pi pi-user"
              class="w-full justify-start"
              text
              @click="navigateTo('/profile')"
            />
            <Button
              v-if="authStore.isAuthenticated"
              label="Sign Out"
              icon="pi pi-sign-out"
              class="w-full justify-start"
              severity="danger"
              text
              @click="handleLogout"
            />
            <Button
              v-else
              label="Sign In"
              icon="pi pi-sign-in"
              class="w-full justify-start"
              severity="success"
              text
              @click="navigateTo('/sign-in')"
            />
          </template>
        </nav>

        <!-- Footer Info -->
        <div class="pt-4 mt-auto border-t border-surface-200 dark:border-surface-700">
          <div class="text-xs text-surface-500 dark:text-surface-400 text-center">
            Libra Chat App
          </div>
        </div>
      </div>
    </Drawer>

    <!-- Desktop Profile Menu -->
    <Menu ref="profileMenu" id="profile_menu" :model="profileMenuItems" :popup="true" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import 'primeicons/primeicons.css';
import { useAuthStore } from '../stores/auth';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import Drawer from 'primevue/drawer';
import Divider from 'primevue/divider';
import { useToast } from 'primevue/usetoast';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const drawerVisible = ref(false);
const profileMenu = ref();

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
  drawerVisible.value = false;
  await authStore.logout();
  router.push('/');
};

function navigateTo(path) {
  router.push(path);
  drawerVisible.value = false;
}

// Toggles the popover menu
const toggleProfileMenu = (event) => {
  if (profileMenu.value && typeof profileMenu.value.toggle === 'function') {
    profileMenu.value.toggle(event);
  }
};

// Defines the items in the popover menu based on auth state
const profileMenuItems = computed(() => {
  if (authStore.isAuthenticated) {
    return [
      {
        label: 'View Profile',
        icon: 'pi pi-user',
        command: () => {
          navigateTo('/profile');
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

onMounted(() => {
  if (authStore.userPhotoUrl) tryPreloadAvatar();
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