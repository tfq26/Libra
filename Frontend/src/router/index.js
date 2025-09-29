import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Chat from '../pages/Chat.vue';
import History from '../pages/History.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat
  },
  {
    path: '/history',
    name: 'History',
    component: History
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Scroll to top when navigating to a new route
    return { top: 0 };
  }
});

export default router;
