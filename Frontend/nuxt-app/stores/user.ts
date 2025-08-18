// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    // State: The data we want to store
    state: () => ({
        isAuthenticated: false,
        userId: null,
        userName: null,
    }),

    // Actions: Functions that change the state
    actions: {
        setUser(account) {
            if (account) {
                this.isAuthenticated = true;
                this.userId = account.localAccountId; // This is the unique, non-PII ID for the user
                this.userName = account.name;
            }
        },
        clearUser() {
            this.isAuthenticated = false;
            this.userId = null;
            this.userName = null;
        },
    },
})