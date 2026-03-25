import { create } from 'zustand';
import type { Human, AuthResponse } from '../types';
import { login, register, getCurrentUser, updateProfile } from '../services/api';

interface AuthState {
  user: Human | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  registerSuccessMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar?: string; password?: string }) => Promise<void>;
  clearError: () => void;
  clearRegisterMessage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('auth_token') || null,
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('auth_token'),
  registerSuccessMessage: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response: AuthResponse = await login(email, password);
      localStorage.setItem('auth_token', response.token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false
      });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null, registerSuccessMessage: null });
    try {
      const response = await register(name, email, password);
      if ('token' in response && 'user' in response) {
        localStorage.setItem('auth_token', response.token);
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        set({
          registerSuccessMessage: response.message,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  fetchCurrentUser: async () => {
    const { token } = get();
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const user: Human = await getCurrentUser();
      set({
        user,
        isLoading: false
      });
    } catch (error) {
      localStorage.removeItem('auth_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: (error as Error).message,
        isLoading: false
      });
    }
  },

  updateUserProfile: async (data: { name?: string; avatar?: string; password?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser: Human = await updateProfile(data);
      set({
        user: updatedUser,
        isLoading: false
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearRegisterMessage: () => set({ registerSuccessMessage: null })
}));
