import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  const token = ref(localStorage.getItem('auth_token') || null);
  const isAuthenticated = computed(() => !!token.value);
  const isLoading = ref(false);
  const error = ref(null);

  // Actions
  const login = async (credentials) => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(credentials)
      // });
      // const data = await response.json();
      
      // Mock response
      const mockUser = {
        id: '1',
        email: credentials.email,
        name: 'Test User'
      };
      const mockToken = 'mock-jwt-token';
      
      // Set user and token
      user.value = mockUser;
      token.value = mockToken;
      localStorage.setItem('auth_token', mockToken);
      
      return mockUser;
    } catch (err) {
      console.error('Login error:', err);
      error.value = 'Failed to login. Please check your credentials.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (userData) => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(userData)
      // });
      // const data = await response.json();
      
      // Mock response
      const mockUser = {
        id: '1',
        email: userData.email,
        name: userData.name || userData.email.split('@')[0]
      };
      const mockToken = 'mock-jwt-token';
      
      // Set user and token
      user.value = mockUser;
      token.value = mockToken;
      localStorage.setItem('auth_token', mockToken);
      
      return mockUser;
    } catch (err) {
      console.error('Registration error:', err);
      error.value = 'Failed to register. Please try again.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('auth_token');
  };

  const checkAuth = async () => {
    if (!token.value) return false;
    
    try {
      // TODO: Replace with actual API call to validate token
      // const response = await fetch('/api/auth/me', {
      //   headers: {
      //     'Authorization': `Bearer ${token.value}`
      //   }
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Invalid token');
      // }
      // 
      // const userData = await response.json();
      // user.value = userData;
      
      // Mock user data
      user.value = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      return true;
    } catch (err) {
      console.error('Auth check failed:', err);
      logout();
      return false;
    }
  };

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    checkAuth
  };
});
