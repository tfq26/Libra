import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { Clerk } from '@clerk/clerk-js'
import App from './App.vue'
import './style.css'

// Initialize Pinia
const pinia = createPinia()

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('@/views/ChatView.vue')
    },
    {
      path: '/chat/:id',
      name: 'ChatConversation',
      component: () => import('@/views/ChatView.vue')
    }
  ]
})

// Initialize Clerk
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const clerk = new Clerk(publishableKey)

// Create the app
const app = createApp(App)

// Use plugins
app.use(pinia)
app.use(router)

// Make Clerk available throughout the app
app.provide('clerk', clerk)

// Mount the app
app.mount('#app')