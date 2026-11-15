/**
 * Authentication and User Account Types
 * Conforms strictly to the Django accounts application API contract.
 */

export type UserRole = 'USER' | 'MODERATOR' | 'STORE_MANAGER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole | string;
  display_name: string;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileData {
  display_name?: string;
  bio?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface PasswordResetRequestData {
  email: string;
}

export interface PasswordResetConfirmData {
  uid: string;
  token: string;
  new_password: string;
  confirm_new_password: string;
}

export interface AuthResponse {
  detail: string;
  user: User;
}

export interface MessageResponse {
  detail: string;
}

export interface AuthErrorResponse {
  detail?: string;
  non_field_errors?: string[];
  username?: string[];
  email?: string[];
  password?: string[];
  current_password?: string[];
  new_password?: string[];
  confirm_new_password?: string[];
  display_name?: string[];
  bio?: string[];
}

export function getRoleLabel(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Archival Administrator';
    case 'MODERATOR':
      return 'Community Curator / Moderator';
    case 'STORE_MANAGER':
      return 'Store & Inventory Custodian';
    case 'USER':
    default:
      return 'Registered Patron';
  }
}

export function getRoleDescription(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Full systemic access: administrative console, user governance, moderation authority, and store configuration.';
    case 'MODERATOR':
      return 'Custodial authority over community dialogues: inspection of flagged reader reports, content preservation, and dispute resolution.';
    case 'STORE_MANAGER':
      return 'Commercial stewardship: folio acquisitions, inventory management, physical catalog dispatch, and order processing.';
    case 'USER':
    default:
      return 'Standard scholarly access: personal reading sanctuary, catalog exploration, folio annotations, reader reviews, and community participation.';
  }
}

