<template>
  <div>
    <!-- Your navigation component goes here -->
    <TheNavbar />

    <!-- Your page content (index.vue, chat.vue, etc.) will be rendered here -->
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
// Make sure the path is correct. Your component is named Navbar.vue
import TheNavbar from '~/components/Navbar.vue';
</script>