import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountSettingsPage } from './AccountSettingsPage';
import { AuthProvider } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import type { User } from '../../types/auth';

vi.mock('../../services/authService', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: vi.fn(),
  updateUserProfile: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  setDemoUser: vi.fn(),
}));

const mockUser: User = {
  id: 'usr-123',
  username: 'patron_elena',
  email: 'elena@akashic.org',
  role: 'USER',
  display_name: 'Elena Solanas',
  bio: 'Patron of metaphysical literature',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('AccountSettingsPage — Patron Settings & Permissions', () => {
  const onNavigateHome = vi.fn();
  const onNavigateLibrary = vi.fn();
  const onSignInRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
  });

  const renderAccountSettingsPage = async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <AuthProvider>
          <AccountSettingsPage
            onNavigateHome={onNavigateHome}
            onNavigateLibrary={onNavigateLibrary}
            onSignInRequest={onSignInRequest}
          />
        </AuthProvider>
      );
    });
    return result!;
  };

  it('1. renders user profile details, immutable username and email, and role badge', async () => {
    await renderAccountSettingsPage();

    expect(screen.getByRole('heading', { name: 'Account Settings' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Elena Solanas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Patron of metaphysical literature')).toBeInTheDocument();
    expect(screen.getByDisplayValue('patron_elena')).toBeDisabled();
    expect(screen.getByDisplayValue('elena@akashic.org')).toBeDisabled();
    expect(screen.getAllByText('Registered Patron').length).toBeGreaterThanOrEqual(1);
  });

  it('2. updates display name and bio successfully via updateProfile', async () => {
    vi.mocked(authService.updateUserProfile).mockResolvedValue({
      ...mockUser,
      display_name: 'Elena V. Solanas',
      bio: 'Curator of labyrinthine folios.',
    });

    await renderAccountSettingsPage();

    const nameInput = screen.getByLabelText(/Display Name/i);
    const bioInput = screen.getByLabelText(/Reader Biography/i);

    fireEvent.change(nameInput, { target: { value: 'Elena V. Solanas' } });
    fireEvent.change(bioInput, { target: { value: 'Curator of labyrinthine folios.' } });

    const saveBtn = screen.getByRole('button', { name: /Save Profile Changes/i });
    const form = saveBtn.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(authService.updateUserProfile).toHaveBeenCalledWith({
        display_name: 'Elena V. Solanas',
        bio: 'Curator of labyrinthine folios.',
      });
      expect(screen.getByText(/Patron profile updated successfully/i)).toBeInTheDocument();
    });
  });

  it('3. rejects whitespace-only display name without calling API', async () => {
    await renderAccountSettingsPage();

    const nameInput = screen.getByLabelText(/Display Name/i);
    fireEvent.change(nameInput, { target: { value: '     ' } });

    const saveBtn = screen.getByRole('button', { name: /Save Profile Changes/i });
    const form = saveBtn.closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText(/Display name cannot consist solely of whitespace/i)).toBeInTheDocument();
    expect(authService.updateUserProfile).not.toHaveBeenCalled();
  });

  it('4. resets form fields to original user values when Reset Changes is clicked', async () => {
    await renderAccountSettingsPage();

    const nameInput = screen.getByLabelText(/Display Name/i);
    fireEvent.change(nameInput, { target: { value: 'Modified Temporary Name' } });
    expect(screen.getByDisplayValue('Modified Temporary Name')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset Changes/i });
    fireEvent.click(resetBtn);

    expect(screen.getByDisplayValue('Elena Solanas')).toBeInTheDocument();
  });

  it('5. changes master passphrase successfully via changePassword', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue({
      detail: 'Password changed successfully.',
    });

    await renderAccountSettingsPage();

    fireEvent.change(screen.getByLabelText(/^Current Master Passphrase$/i), {
      target: { value: 'OldSecretPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/^New Master Passphrase$/i), {
      target: { value: 'BrandNewSecretPass99!' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm New Passphrase$/i), {
      target: { value: 'BrandNewSecretPass99!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Save New Passphrase/i });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith({
        current_password: 'OldSecretPass1!',
        new_password: 'BrandNewSecretPass99!',
        confirm_new_password: 'BrandNewSecretPass99!',
      });
      expect(screen.getByText(/Password changed successfully/i)).toBeInTheDocument();
    });
  });

  it('6. rejects password change when new passphrases do not match', async () => {
    await renderAccountSettingsPage();

    fireEvent.change(screen.getByLabelText(/^Current Master Passphrase$/i), {
      target: { value: 'OldSecretPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/^New Master Passphrase$/i), {
      target: { value: 'BrandNewSecretPass99!' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm New Passphrase$/i), {
      target: { value: 'MismatchSecretPass99!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Save New Passphrase/i });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText(/New passphrases do not match/i)).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('7. rejects password change when new passphrase is same as current passphrase', async () => {
    await renderAccountSettingsPage();

    fireEvent.change(screen.getByLabelText(/^Current Master Passphrase$/i), {
      target: { value: 'SameSecretPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/^New Master Passphrase$/i), {
      target: { value: 'SameSecretPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm New Passphrase$/i), {
      target: { value: 'SameSecretPass1!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Save New Passphrase/i });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText(/New passphrase cannot be identical to the current passphrase/i)).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('8. renders accurate least-privilege role governance notice for USER role', async () => {
    await renderAccountSettingsPage();

    expect(screen.getByRole('heading', { name: 'Account Identity & Role Governance' })).toBeInTheDocument();
    expect(screen.getByText(/Standard scholarly access: personal reading sanctuary/i)).toBeInTheDocument();
    expect(screen.getByText(/Patron roles cannot be escalated or modified through self-service profile requests/i)).toBeInTheDocument();
  });

  it('9. navigates back when clicking the return button', async () => {
    await renderAccountSettingsPage();

    const returnBtn = screen.getByRole('button', { name: /Return to Personal Library/i });
    fireEvent.click(returnBtn);

    expect(onNavigateLibrary).toHaveBeenCalled();
  });
});
