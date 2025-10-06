// Base API URL - will be different in development and production
const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProduction
  ? '/api' // Relative URL in production (same domain)
  : 'http://localhost:3001'; // Your backend URL in development

export default {
  API_BASE_URL,
  // Add other config values here
};
