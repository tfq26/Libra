import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import axios from 'axios';

const app = createApp(App);
const pinia = createPinia();

// Make axios available globally
app.config.globalProperties.$http = axios;

// Use plugins
app.use(pinia);
app.use(router);

app.mount('#app');