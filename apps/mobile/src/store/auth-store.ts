import { create } from 'zustand';
import { getToken, saveToken, saveRefreshToken, clearTokens } from '../services/api';
import type { User } from '../types';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  initialize: () => Promise<void>;
  setAuth: (user: User) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoading: true,
  isAuthenticated: false,
  user: null,

  initialize: async () => {
    const token = await getToken();
    if (token) {
      set({ user: { id: '', email: '', name: null }, isAuthenticated: true });
    }
    set({ isLoading: false });
  },

  setAuth: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));
