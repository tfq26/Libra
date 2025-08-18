// middleware/auth.ts
import { useUserStore } from '../stores/user'

// No need to import defineNuxtRouteMiddleware, Nuxt does it automatically.
export default defineNuxtRouteMiddleware((to, _from) => {
    const userStore = useUserStore()

    // If the user is not authenticated and is trying to access a protected page
    if (!userStore.isAuthenticated && to.path !== '/login') {
        // navigateTo is also auto-imported by Nuxt.
        return navigateTo('/login')
    }
})
