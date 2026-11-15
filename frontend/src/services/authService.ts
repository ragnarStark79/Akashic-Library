/**
 * Authentication Service
 * Communicates with the Django /api/auth/ endpoints.
 * Handles SessionAuthentication cookies and CSRF tokens.
 */

import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  UpdateProfileData,
  PasswordChangeData,
  PasswordResetConfirmData,
  MessageResponse,
} from '@/types/auth';
import { getDiscoveryDataMode } from './discoveryService';

const BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

// Deterministic in-memory user for demo preview mode
let demoSessionUser: User | null = null;

export function setDemoUser(user: User | null) {
  demoSessionUser = user;
}

/**
 * Extract CSRF token from document.cookie for Django SessionAuthentication.
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Build request headers including Content-Type and X-CSRFToken.
 */
export function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const csrf = getCsrfToken();
  if (csrf) {
    headers['X-CSRFToken'] = csrf;
  }
  return headers;
}

/**
 * Authenticate with username and password.
 * Establishes a server session cookie upon success.
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    if (credentials.username && credentials.password) {
      const mockUser: User = {
        id: 'usr-demo-solanas',
        username: credentials.username,
        email: `${credentials.username.toLowerCase()}@akashic.org`,
        role: 'USER',
        display_name: 'Elena Solanas',
        bio: 'Patron of speculative metafiction and labyrinthine texts.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      demoSessionUser = mockUser;
      return {
        detail: 'Login successful.',
        user: mockUser,
      };
    }
    throw new Error('Both username and password are required.');
  }

  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      data.non_field_errors?.[0] ||
      data.detail ||
      (Array.isArray(data.username) ? data.username[0] : null) ||
      (Array.isArray(data.password) ? data.password[0] : null) ||
      'Invalid username or password.';
    throw new Error(errorMsg);
  }

  return data as AuthResponse;
}

/**
 * Register a new user account.
 * Requires username, email, and password.
 */
export async function registerUser(credentials: RegisterCredentials): Promise<AuthResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    const mockUser: User = {
      id: `usr-demo-${Date.now()}`,
      username: credentials.username,
      email: credentials.email,
      role: 'USER',
      display_name: credentials.username,
      bio: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return {
      detail: 'Account created successfully.',
      user: mockUser,
    };
  }

  const res = await fetch(`${BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      (Array.isArray(data.username) ? data.username[0] : null) ||
      (Array.isArray(data.email) ? data.email[0] : null) ||
      (Array.isArray(data.password) ? data.password[0] : null) ||
      data.non_field_errors?.[0] ||
      data.detail ||
      'Registration could not be completed. Please verify your credentials.';
    throw new Error(errorMsg);
  }

  return data as AuthResponse;
}

/**
 * Invalidate the server session cookie.
 */
export async function logoutUser(): Promise<void> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    demoSessionUser = null;
    return;
  }

  try {
    await fetch(`${BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}),
    });
  } catch {
    // Graceful no-op on network failure
  }
}

/**
 * Retrieve the currently authenticated user from the active session.
 * Returns null if not authenticated (403 Forbidden).
 */
export async function getCurrentUser(): Promise<User | null> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('demo_user') === 'elena' || p.get('demo_user') === 'true') {
        return {
          id: 'usr-demo-solanas',
          username: 'patron_elena',
          email: 'elena@akashic.org',
          role: 'USER',
          display_name: 'Elena Solanas',
          bio: 'Patron of speculative metafiction and labyrinthine texts.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      if (p.get('demo_user') === 'none' || p.get('demo_user') === 'false') {
        return null;
      }
    }
    return demoSessionUser;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/me/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
    });

    if (res.ok) {
      const user = await res.json();
      return user as User;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Update editable profile details (display_name, bio) for the current user.
 */
export async function updateUserProfile(data: UpdateProfileData): Promise<User> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    if (!demoSessionUser) {
      demoSessionUser = {
        id: 'usr-demo-solanas',
        username: 'patron_elena',
        email: 'elena@akashic.org',
        role: 'USER',
        display_name: data.display_name ?? 'Elena Solanas',
        bio: data.bio ?? 'Patron of speculative metafiction and labyrinthine texts.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      demoSessionUser = {
        ...demoSessionUser,
        display_name: data.display_name !== undefined ? data.display_name : demoSessionUser.display_name,
        bio: data.bio !== undefined ? data.bio : demoSessionUser.bio,
        updated_at: new Date().toISOString(),
      };
    }
    return demoSessionUser;
  }

  const res = await fetch(`${BASE_URL}/auth/me/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const resData = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      (Array.isArray(resData.display_name) ? resData.display_name[0] : null) ||
      (Array.isArray(resData.bio) ? resData.bio[0] : null) ||
      resData.non_field_errors?.[0] ||
      resData.detail ||
      'Profile could not be updated. Please verify your inputs.';
    throw new Error(errorMsg);
  }

  return resData as User;
}

/**
 * Change the authenticated user's password.
 */
export async function changePassword(data: PasswordChangeData): Promise<MessageResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    return { detail: 'Password changed successfully.' };
  }

  const res = await fetch(`${BASE_URL}/auth/password/change/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const resData = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      (Array.isArray(resData.current_password) ? resData.current_password[0] : null) ||
      (Array.isArray(resData.new_password) ? resData.new_password[0] : null) ||
      (Array.isArray(resData.confirm_new_password) ? resData.confirm_new_password[0] : null) ||
      resData.non_field_errors?.[0] ||
      resData.detail ||
      'Password could not be changed. Please verify your credentials.';
    throw new Error(errorMsg);
  }

  return resData as MessageResponse;
}

/**
 * Request a forgotten password reset email.
 */
export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    return {
      detail: 'If an account exists for this address, password recovery instructions will be sent.',
    };
  }

  const res = await fetch(`${BASE_URL}/auth/password/reset/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  const resData = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      (Array.isArray(resData.email) ? resData.email[0] : null) ||
      resData.non_field_errors?.[0] ||
      resData.detail ||
      'Password recovery request could not be processed.';
    throw new Error(errorMsg);
  }

  return resData as MessageResponse;
}

/**
 * Confirm forgotten password reset with a valid token.
 */
export async function confirmPasswordReset(data: PasswordResetConfirmData): Promise<MessageResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    return {
      detail: 'Password has been reset successfully. You may now sign in with your new password.',
    };
  }

  const res = await fetch(`${BASE_URL}/auth/password/reset/confirm/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const resData = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      (Array.isArray(resData.new_password) ? resData.new_password[0] : null) ||
      (Array.isArray(resData.confirm_new_password) ? resData.confirm_new_password[0] : null) ||
      resData.non_field_errors?.[0] ||
      resData.detail ||
      'Password reset could not be completed. The link may be expired or invalid.';
    throw new Error(errorMsg);
  }

  return resData as MessageResponse;
}
