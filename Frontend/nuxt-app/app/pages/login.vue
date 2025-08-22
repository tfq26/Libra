<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-6">
    <h1 class="text-3xl font-semibold">Sign in</h1>
    <div v-if="status === 'unauthenticated'">
      <UButton color="black" size="lg" icon="i-heroicons-lock-closed" @click="() => signIn('azure-ad')">
        Continue with Microsoft
      </UButton>
    </div>
    <div v-else-if="status === 'loading'">
      <p>Loading…</p>
    </div>
    <div v-else>
      <p class="text-center">You are already signed in as <strong>{{ data?.user?.email || data?.user?.name }}</strong>.</p>
      <div class="flex gap-4 justify-center mt-4">
        <UButton to="/" variant="solid" color="black">Go to Home</UButton>
        <UButton variant="outline" color="gray" @click="signOut">Sign out</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Public page: don't require auth for this route
definePageMeta({ auth: false })

const { status, data, signIn, signOut } = useAuth()
</script>
