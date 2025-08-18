<template>
  <div>
    <!-- Desktop Navigation (Visible on medium screens and up) -->
    <nav class="hidden md:flex bg-sunglow-700 shadow-md p-4 justify-between items-center">
      <NuxtLink to="/" class="text-2xl font-bold text-eerie-black-500">Libra</NuxtLink>
      <div class="flex items-center space-x-6">
        <!-- Added labels and adjusted colors for visibility -->
        <UButton
            to="/chat"
            label="Chat"
            variant="ghost"
            color="black"
            size="lg"
            icon="i-heroicons-chat-bubble-left-right"
        />
        <UButton
            to="/history"
            label="History"
            variant="ghost"
            color="black"
            size="lg"
            icon="i-heroicons-clock"
        />
      </div>
    </nav>

    <!-- Mobile Navigation (Visible on small screens) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-eerie-black-900 shadow-lg flex justify-around p-2 z-50">
      <UButton
          to="/"
          variant="ghost"
          color="gray"
          class="flex flex-col items-center"
      >
        <UIcon name="i-heroicons-home" class="text-2xl mb-1" />
        <!-- Added text label back -->
        <span class="text-xs">Home</span>
      </UButton>
      <UButton
          to="/chat"
          variant="ghost"
          color="gray"
          class="flex flex-col items-center"
      >
        <UIcon name="i-heroicons-chat-bubble-left-right" class="text-2xl mb-1" />
        <!-- Added text label back -->
        <span class="text-xs">Chat</span>
      </UButton>
      <UButton
          to="/history"
          variant="ghost"
          color="gray"
          class="flex flex-col items-center"
      >
        <UIcon name="i-heroicons-clock" class="text-2xl mb-1" />
        <!-- Added text label back -->
        <span class="text-xs">History</span>
      </UButton>
    </nav>
  </div>
</template>

<script setup>
// This component is purely presentational, so no script logic is needed for now.
</script>

<style scoped>
/* Add a subtle shadow to the top of the mobile navbar */
.md\:hidden {
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.05);
}
</style>
