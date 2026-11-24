import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthPage } from './AuthPage';
import { AuthProvider } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import type { User } from '../../types/auth';

vi.mock('../../services/authService', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  updateUserProfile: vi.fn(),
  changePassword: vi.fn(),
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

describe('AuthPage — Patron Authentication Hub', () => {
  const onNavigateHome = vi.fn();
  const onAuthSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
  });

  const renderAuthPage = async (
    initialTab: 'signin' | 'register' | 'recover' | 'reset' = 'signin',
    initialUid = '',
    initialToken = ''
  ) => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <AuthProvider>
          <AuthPage
            onNavigateHome={onNavigateHome}
            onAuthSuccess={onAuthSuccess}
            initialTab={initialTab}
            initialUid={initialUid}
            initialToken={initialToken}
          />
        </AuthProvider>
      );
    });
    return result!;
  };

  it('1. renders the default Sign In tab with appropriate branding and fields', async () => {
    await renderAuthPage('signin');

    expect(screen.getByRole('heading', { name: 'Patron Sanctuary Entry' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Patron Identifier or Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Master Archival Passphrase$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Authenticate & Enter Sanctuary/i })).toBeInTheDocument();
  });

  it('2. toggles password visibility on the Sign In form', async () => {
    await renderAuthPage('signin');

    const passwordInput = screen.getByLabelText(/^Master Archival Passphrase$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /Show passphrase/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: /Hide passphrase/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('3. displays validation error when submitting empty credentials', async () => {
    await renderAuthPage('signin');

    const form = screen.getByRole('button', { name: /Authenticate & Enter Sanctuary/i }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText('Both username and password are required.')).toBeInTheDocument();
    expect(authService.loginUser).not.toHaveBeenCalled();
  });

  it('4. successfully submits sign-in credentials and triggers onAuthSuccess', async () => {
    vi.mocked(authService.loginUser).mockResolvedValue({
      detail: 'Login successful.',
      user: mockUser,
    });

    await renderAuthPage('signin');

    const identifierInput = screen.getByLabelText(/Patron Identifier or Username/i);
    const passwordInput = screen.getByLabelText(/^Master Archival Passphrase$/i);
    const form = screen.getByRole('button', { name: /Authenticate & Enter Sanctuary/i }).closest('form');

    fireEvent.change(identifierInput, { target: { value: 'patron_elena' } });
    fireEvent.change(passwordInput, { target: { value: 'SecretKey123!' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(authService.loginUser).toHaveBeenCalledWith({
        username: 'patron_elena',
        password: 'SecretKey123!',
      });
      expect(onAuthSuccess).toHaveBeenCalled();
    });
  });

  it('5. displays error banner when authentication fails', async () => {
    vi.mocked(authService.loginUser).mockRejectedValue(
      new Error('Invalid patron credentials provided.')
    );

    await renderAuthPage('signin');

    fireEvent.change(screen.getByLabelText(/Patron Identifier or Username/i), {
      target: { value: 'unknown_patron' },
    });
    fireEvent.change(screen.getByLabelText(/^Master Archival Passphrase$/i), {
      target: { value: 'wrong_key' },
    });
    const form = screen.getByRole('button', { name: /Authenticate & Enter Sanctuary/i }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText('Invalid patron credentials provided.')).toBeInTheDocument();
    expect(onAuthSuccess).not.toHaveBeenCalled();
  });

  it('6. switches to the Register tab and displays registration form fields', async () => {
    await renderAuthPage('signin');

    const registerTabBtn = screen.getByRole('tab', { name: /Inscribe Ledger/i });
    fireEvent.click(registerTabBtn);

    expect(screen.getByRole('heading', { name: 'Inscribe Your Name in the Great Ledger' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Patron Handle \(Username\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correspondence Address \(Email\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Master Passphrase$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm Passphrase$/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('7. displays error if passwords do not match during registration', async () => {
    await renderAuthPage('register');

    fireEvent.change(screen.getByLabelText(/Patron Handle \(Username\)/i), {
      target: { value: 'newpatron' },
    });
    fireEvent.change(screen.getByLabelText(/Correspondence Address \(Email\)/i), {
      target: { value: 'new@akashic.org' },
    });
    fireEvent.change(screen.getByLabelText(/^Master Passphrase$/i), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm Passphrase$/i), {
      target: { value: 'PasswordMismatch999' },
    });

    const form = screen.getByRole('button', { name: /Inscribe Patron Ledger/i }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText('Passphrases do not match. Please re-enter with care.')).toBeInTheDocument();
    expect(authService.registerUser).not.toHaveBeenCalled();
  });

  it('8. displays error if the patron archival vow is unchecked', async () => {
    await renderAuthPage('register');

    fireEvent.change(screen.getByLabelText(/Patron Handle \(Username\)/i), {
      target: { value: 'newpatron' },
    });
    fireEvent.change(screen.getByLabelText(/Correspondence Address \(Email\)/i), {
      target: { value: 'new@akashic.org' },
    });
    fireEvent.change(screen.getByLabelText(/^Master Passphrase$/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm Passphrase$/i), {
      target: { value: 'ValidPass123' },
    });

    const vowCheckbox = screen.getByRole('checkbox');
    fireEvent.click(vowCheckbox); // uncheck

    const form = screen.getByRole('button', { name: /Inscribe Patron Ledger/i }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText(/Please confirm the patron custodial vow to proceed with registration./i)).toBeInTheDocument();
    expect(authService.registerUser).not.toHaveBeenCalled();
  });

  it('9. registers successfully and transitions to sign in with success feedback', async () => {
    vi.mocked(authService.registerUser).mockResolvedValue({
      detail: 'User registered successfully.',
      user: mockUser,
    });

    await renderAuthPage('register');

    fireEvent.change(screen.getByLabelText(/Patron Handle \(Username\)/i), {
      target: { value: 'patron_elena' },
    });
    fireEvent.change(screen.getByLabelText(/Correspondence Address \(Email\)/i), {
      target: { value: 'elena@akashic.org' },
    });
    fireEvent.change(screen.getByLabelText(/^Master Passphrase$/i), {
      target: { value: 'SecretKey123!' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm Passphrase$/i), {
      target: { value: 'SecretKey123!' },
    });

    const form = screen.getByRole('button', { name: /Inscribe Patron Ledger/i }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(authService.registerUser).toHaveBeenCalledWith({
        username: 'patron_elena',
        email: 'elena@akashic.org',
        password: 'SecretKey123!',
      });
      expect(screen.getByText(/Patron record for patron_elena has been inscribed in the Great Ledger/i)).toBeInTheDocument();
    });
  });

  it('10. renders functional email recovery form on Recover tab without deferred notice', async () => {
    await renderAuthPage('recover');

    expect(screen.getByRole('heading', { name: 'Archival Folio Recovery' })).toBeInTheDocument();
    expect(screen.queryByText(/Automated self-service password recovery is scheduled for a future milestone/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Registered Correspondence Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Recovery Link/i })).toBeInTheDocument();
  });

  it('11. displays validation error when submitting empty recovery email', async () => {
    await renderAuthPage('recover');

    const submitBtn = screen.getByRole('button', { name: /Send Recovery Link/i });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText(/A registered email address is required/i)).toBeInTheDocument();
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('12. successfully requests recovery email and displays generic enumeration-resistant response', async () => {
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      detail: 'If an account exists for this address, password recovery instructions will be sent.',
    });

    await renderAuthPage('recover');

    const emailInput = screen.getByLabelText(/Registered Correspondence Address/i);
    fireEvent.change(emailInput, { target: { value: 'elena@akashic.org' } });

    const submitBtn = screen.getByRole('button', { name: /Send Recovery Link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('elena@akashic.org');
      expect(screen.getByText(/If an account exists for this address, password recovery instructions will be sent/i)).toBeInTheDocument();
    });
  });

  it('13. renders Renew Master Passphrase form on reset tab with token and uid', async () => {
    await renderAuthPage('reset', 'uid123', 'tok456');

    expect(screen.getByRole('heading', { name: 'Renew Master Passphrase' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Master Passphrase$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm New Passphrase$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save New Master Passphrase/i })).toBeInTheDocument();
  });

  it('14. displays error when reset passphrases do not match', async () => {
    await renderAuthPage('reset', 'uid123', 'tok456');

    fireEvent.change(screen.getByLabelText(/^New Master Passphrase$/i), {
      target: { value: 'StrongPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm New Passphrase$/i), {
      target: { value: 'DifferentPass123!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Save New Master Passphrase/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Passphrase confirmation does not match/i)).toBeInTheDocument();
    expect(authService.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('15. successfully completes reset and transitions to sign in tab', async () => {
    vi.mocked(authService.confirmPasswordReset).mockResolvedValue({
      detail: 'Password has been reset successfully. You may now sign in with your new password.',
    });

    await renderAuthPage('reset', 'uid123', 'tok456');

    fireEvent.change(screen.getByLabelText(/^New Master Passphrase$/i), {
      target: { value: 'BrandNewPass123!' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm New Passphrase$/i), {
      target: { value: 'BrandNewPass123!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Save New Master Passphrase/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.confirmPasswordReset).toHaveBeenCalledWith({
        uid: 'uid123',
        token: 'tok456',
        new_password: 'BrandNewPass123!',
        confirm_new_password: 'BrandNewPass123!',
      });
      expect(screen.getByRole('heading', { name: 'Patron Sanctuary Entry' })).toBeInTheDocument();
    });
  });

  it('16. returns to public discovery when clicking Return to Public Discovery', async () => {
    await renderAuthPage('signin');

    const returnBtn = screen.getByRole('button', { name: /Return to Public Discovery/i });
    fireEvent.click(returnBtn);

    expect(onNavigateHome).toHaveBeenCalled();
  });
});
