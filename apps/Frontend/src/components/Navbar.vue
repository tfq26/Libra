<template>
  <div>
    <!-- Desktop Navigation -->
    <div class="hidden md:flex fixed top-6 right-6 z-50 flex-row items-center space-x-3">
      <Button
        icon="pi pi-home"
        :class="{ 'p-button-warning': route.path === '/', 'p-button-secondary': route.path !== '/', 'p-button-rounded p-button-icon-only p-button-lg': true }"
        v-tooltip.bottom="'Home'"
        @click="router.push('/')"
      />
      <Button
        icon="pi pi-comment"
        :class="{ 'p-button-warning': route.path.startsWith('/chat'), 'p-button-secondary': !route.path.startsWith('/chat'), 'p-button-rounded p-button-icon-only p-button-lg': true }"
        v-tooltip.bottom="'Chat'"
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
          v-tooltip.bottom="'Profile'"
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
    <Drawer
      v-model:visible="drawerVisible"
      position="right"
      class="w-80 border-l border-surface-100/60 dark:border-surface-700/60 
             dark:bg-surface-900/80 backdrop-blur-xl transition-all duration-300"
      fluid

    >
      <!-- Header -->
      <template #header>
        <div class="flex items-center gap-3 px-2 py-1">
          <div
            class="rounded-full flex items-center justify-center shadow-md overflow-hidden ring-2 ring-primary/20"
            style="width: 56px; height: 56px;"
          >
            <img
              v-if="imageLoaded && authStore.userPhotoUrl"
              :src="authStore.userPhotoUrl"
              alt="avatar"
              class="w-full h-full object-cover rounded-full"
              @error="() => { imageLoaded = false; imageError = true }"
            />
            <span v-else class="text-lg font-semibold text-surface-700 dark:text-surface-200">
              <template v-if="initials">{{ initials }}</template>
              <template v-else>
                <i class="pi pi-user text-xl text-primary"></i>
              </template>
            </span>
          </div>

          <div>
            <div v-if="authStore.isAuthenticated">
              <div class="font-semibold text-surface-900 dark:text-surface-0 leading-tight">
                {{ authStore.user?.displayName || authStore.user?.name || 'User' }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400 truncate max-w-[160px]">
                {{ authStore.user?.email }}
              </div>
            </div>
            <div v-else>
              <div class="text-surface-600 dark:text-surface-400">Not signed in</div>
            </div>
          </div>
        </div>
      </template>

      <!-- Main Content -->
      <div class="flex flex-col h-full pb-2">
        <!-- Nav Links -->
        <nav class="flex-1 space-y-1 px-2 pt-2">
          <Button
            label="Home"
            icon="pi pi-home"
            :class="{
              'bg-primary/10 text-primary font-medium': route.path === '/',
              'hover:bg-surface-100 dark:hover:bg-surface-800': route.path !== '/'
            }"
            class="w-full justify-start rounded-lg py-2 text-sm transition-colors duration-200"
            text
            @click="navigateTo('/')"
          />
          <Button
            label="Chat"
            icon="pi pi-comment"
            :class="{
              'bg-primary/10 text-primary font-medium': route.path.startsWith('/chat'),
              'hover:bg-surface-100 dark:hover:bg-surface-800': !route.path.startsWith('/chat')
            }"
            class="w-full justify-start rounded-lg py-2 text-sm transition-colors duration-200"
            text
            @click="navigateTo('/chat')"
          />

          <template v-if="!authStore.loading">
            <Divider class="my-3 opacity-60" v-if="authStore.isAuthenticated" />

            <Button
              v-if="authStore.isAuthenticated"
              label="Profile"
              icon="pi pi-user"
              class="w-full justify-start rounded-lg py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              text
              @click="navigateTo('/profile')"
            />
            <Button
              v-if="authStore.isAuthenticated"
              label="Sign Out"
              icon="pi pi-sign-out"
              class="w-full justify-start rounded-lg py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              text
              @click="handleLogout"
            />
            <Button
              v-else
              label="Sign In"
              icon="pi pi-sign-in"
              class="w-full justify-start rounded-lg py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
              text
              @click="navigateTo('/sign-in')"
            />
          </template>
        </nav>

        <!-- Footer -->
        <div class="pt-4 mt-auto border-t border-surface-200/70 dark:border-surface-700/70">
          <div class="text-xs text-surface-500 dark:text-surface-400 text-center py-3">
            Libra Chat App — v1.0
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