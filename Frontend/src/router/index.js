import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import AboutView from '../views/AboutView.vue';
import ChatView from '../views/ChatView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: 'Home' }
  },
  {
    path: '/about',
    name: 'About',
    component: AboutView,
    meta: { title: 'About' }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatView,
    meta: { title: 'Chat' },
    children: [
      {
        path: ':id?',
        component: ChatView
      }
    ]
  },
  // Redirect to home if route doesn't exist
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// Update page title based on route meta
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} | Libra` : 'Libra';
  next();
});

export default router;
