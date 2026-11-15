/**
 * Authentication Context & Provider
 * Manages authenticated user state, session persistence across page loads,
 * and intended post-login destination routing.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginCredentials, RegisterCredentials, UpdateProfileData } from '@/types/auth';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  updateUserProfile,
} from '@/services/authService';

export interface IntendedDestination {
  view: string;
  bookId?: string;
  genreId?: string;
  filters?: Record<string, string>;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile?: (data: UpdateProfileData) => Promise<User>;
  updateUser?: (updatedUser: User) => void;
  refreshUser: () => Promise<User | null>;
  intendedDestination: IntendedDestination | null;
  setIntendedDestination: (dest: IntendedDestination | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [intendedDestination, setIntendedDestination] = useState<IntendedDestination | null>(null);

  // Restore authenticated session on initial application mount
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const activeUser = await getCurrentUser();
      setUser(activeUser);
      return activeUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<User> => {
      const response = await loginUser(credentials);
      setUser(response.user);
      return response.user;
    },
    []
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<User> => {
      const response = await registerUser(credentials);
      return response.user;
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutUser();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<User> => {
      const updated = await updateUserProfile(data);
      setUser(updated);
      return updated;
    },
    []
  );

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        updateUser,
        refreshUser,
        intendedDestination,
        setIntendedDestination,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
