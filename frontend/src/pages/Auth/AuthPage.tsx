/**
 * Patron Authentication Hub Page
 * Matches Phase 4A Design Reference: akashic_library_patron_authentication_hub
 * Conforms strictly to the Django /api/auth/ login and registration contracts.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  History,
  Lock,
  Mail,
  PenTool,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { requestPasswordReset, confirmPasswordReset } from '@/services/authService';
import styles from './AuthPage.module.css';

export interface AuthPageProps {
  onNavigateHome: () => void;
  onAuthSuccess?: () => void;
  initialTab?: 'signin' | 'register' | 'recover' | 'reset';
  initialUid?: string;
  initialToken?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onNavigateHome,
  onAuthSuccess,
  initialTab = 'signin',
  initialUid = '',
  initialToken = '',
}) => {
  const { login, register, isAuthenticated, user } = useAuth();

  // Check URL query parameters for reset token/uid
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const paramTab = urlParams?.get('tab') as 'signin' | 'register' | 'recover' | 'reset' | null;
  const paramUid = urlParams?.get('uid') || initialUid;
  const paramToken = urlParams?.get('token') || initialToken;

  const determinedInitialTab: 'signin' | 'register' | 'recover' | 'reset' =
    paramTab === 'reset' || (paramUid && paramToken)
      ? 'reset'
      : (paramTab || initialTab);

  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'recover' | 'reset'>(determinedInitialTab);

  // Sign In Form State
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Registration Form State
  const [regRole, setRegRole] = useState<'USER' | 'STORE_MANAGER'>('USER');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [managerApplicationSubmitted, setManagerApplicationSubmitted] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAgreedToVow, setRegAgreedToVow] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Recover Request Form State
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoverSuccessMessage, setRecoverSuccessMessage] = useState<string | null>(null);

  // Reset Passphrase Form State
  const resetUid = paramUid;
  const resetToken = paramToken;
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Evaluate Password Strength (min 8 chars as enforced by Django validator)
  const calculatePasswordStrength = (pass: string): { score: number; label: string } => {
    if (!pass) return { score: 0, label: 'Unentered' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Standard (Minimum 8 chars)' };
      case 2:
        return { score: 2, label: 'Adequate' };
      case 3:
        return { score: 3, label: 'Scholarly Grade' };
      case 4:
        return { score: 4, label: 'Archival Grade' };
      default:
        return { score: 1, label: 'Weak' };
    }
  };

  const passStrength = calculatePasswordStrength(regPassword);

  // Handle Sign In submission
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInIdentifier.trim() || !signInPassword) {
      setSignInError('Both username and password are required.');
      return;
    }

    setSignInLoading(true);
    setSignInError(null);

    try {
      await login({
        username: signInIdentifier.trim(),
        password: signInPassword,
      });
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        onNavigateHome();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials provided.';
      setSignInError(msg);
    } finally {
      setSignInLoading(false);
    }
  };

  // Handle Registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccessMessage(null);

    if (regUsername.trim().length < 3) {
      setRegError('Username must be at least 3 characters long.');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setRegError('Please supply a valid correspondence email address.');
      return;
    }

    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters long as required by the archival policy.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passphrases do not match. Please re-enter with care.');
      return;
    }

    if (!regAgreedToVow) {
      setRegError('Please confirm the patron custodial vow to proceed with registration.');
      return;
    }

    setRegLoading(true);

    try {
      const regPayload: any = {
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
      };
      if (regRole && regRole !== 'USER') {
        regPayload.role = regRole;
      }
      if (regBusinessName.trim()) {
        regPayload.business_name = regBusinessName.trim();
      }

      await register(regPayload);

      if (regRole === 'STORE_MANAGER') {
        setManagerApplicationSubmitted(true);
        setRegSuccessMessage(
          `Your Store Manager application for "${regUsername.trim()}" has been recorded in PENDING status. An Akashic Administrator will review your curator credentials before product authoring and stock tools are unlocked.`
        );
      } else {
        setRegSuccessMessage(
          `Patron record for ${regUsername.trim()} has been inscribed in the Great Ledger. You may now enter your passphrase to access your sanctuary.`
        );
        // Pre-fill sign-in username for patron convenience
        setSignInIdentifier(regUsername.trim());
        setSignInPassword('');
        // Switch to sign-in tab after short acknowledgment
        setActiveTab('signin');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Recover Request submission
  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail.trim()) {
      setRecoverError('A registered email address is required.');
      return;
    }

    setRecoverLoading(true);
    setRecoverError(null);
    setRecoverSuccessMessage(null);

    try {
      const resp = await requestPasswordReset(recoverEmail.trim());
      setRecoverSuccessMessage(
        resp.detail ||
          'If an account exists for this address, password recovery instructions will be sent. Please inspect your inbox.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not process recovery request.';
      setRecoverError(msg);
    } finally {
      setRecoverLoading(false);
    }
  };

  // Handle Reset Passphrase submission
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (resetPassword.length < 8) {
      setResetError('Master passphrase must be at least 8 characters in length.');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passphrase confirmation does not match.');
      return;
    }

    if (!resetUid || !resetToken) {
      setResetError('Recovery folio tokens are missing or invalid. Please request a fresh recovery link.');
      return;
    }

    setResetLoading(true);
    try {
      const resp = await confirmPasswordReset({
        uid: resetUid,
        token: resetToken,
        new_password: resetPassword,
        confirm_new_password: resetConfirmPassword,
      });

      // Clear tokens from URL for security
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('uid');
        cleanUrl.searchParams.delete('token');
        cleanUrl.searchParams.set('tab', 'signin');
        window.history.replaceState({}, '', cleanUrl.toString());
      }

      setRegSuccessMessage(
        resp.detail || 'Master passphrase renewed successfully. You may now enter the sanctuary.'
      );
      setActiveTab('signin');
      setResetPassword('');
      setResetConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed. The token may be expired or invalid.';
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  // If already authenticated, show friendly confirmation with option to return
  if (isAuthenticated && user) {
    return (
      <div className={styles.page}>
        <div className={styles.ambientBloomTop} aria-hidden="true" />
        <div className={styles.ambientBloomBottom} aria-hidden="true" />

        <div className={styles.container}>
          <div className={styles.authCard}>
            <div className={styles.cardBody} style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(24, 92, 88, 0.1)',
                  color: 'var(--color-action-primary)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <ShieldCheck size={48} />
              </div>
              <h2 className={styles.formTitle}>Patron Authenticated</h2>
              <p className={styles.formSubtitle} style={{ marginBottom: 'var(--space-6)' }}>
                You are currently signed in to the sanctuary stacks as{' '}
                <strong>{user.display_name || user.username}</strong> ({user.email}).
              </p>
              <button
                type="button"
                className={styles.submitButton}
                onClick={onAuthSuccess || onNavigateHome}
              >
                <span>Enter Personal Sanctuary</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.ambientBloomTop} aria-hidden="true" />
      <div className={styles.ambientBloomBottom} aria-hidden="true" />

      <div className={styles.container}>
        {/* Header & Return Navigation */}
        <div className={styles.headerBar}>
          <button
            type="button"
            className={styles.returnLink}
            onClick={onNavigateHome}
            aria-label="Return to Public Discovery"
          >
            <ArrowLeft size={16} />
            <span>Return to Public Discovery</span>
          </button>

          <span className={styles.registryPill}>
            <BookOpen size={13} />
            <span>Sanctuary Gateway</span>
          </span>
        </div>

        {/* Authentication Card */}
        <div className={styles.authCard}>
          {/* Segmented Tab Navigation */}
          <nav className={styles.tabNav} aria-label="Authentication Modes" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signin'}
              className={`${styles.tabButton} ${activeTab === 'signin' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('signin')}
            >
              <Lock size={16} />
              <span>Patron Access</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              className={`${styles.tabButton} ${activeTab === 'register' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('register')}
            >
              <PenTool size={16} />
              <span>Inscribe Ledger</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'recover'}
              className={`${styles.tabButton} ${activeTab === 'recover' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('recover')}
            >
              <History size={16} />
              <span>Recover Folio</span>
            </button>

            {activeTab === 'reset' && (
              <button
                type="button"
                role="tab"
                aria-selected={true}
                className={`${styles.tabButton} ${styles.tabButtonActive}`}
                onClick={() => setActiveTab('reset')}
              >
                <Lock size={16} />
                <span>Renew Passphrase</span>
              </button>
            )}
          </nav>

          <div className={styles.cardBody}>
            {/* ── TAB 1: SIGN IN (PATRON ACCESS) ── */}
            {activeTab === 'signin' && (
              <section aria-labelledby="signin-heading">
                <div className={styles.formHeader}>
                  <h1 id="signin-heading" className={styles.formTitle}>
                    Patron Sanctuary Entry
                  </h1>
                  <p className={styles.formSubtitle}>
                    Present your registered patron credentials to access your personal reading desks,
                    shelves, and marginalia.
                  </p>
                </div>

                {regSuccessMessage && (
                  <div className={styles.successBanner} role="status">
                    <ShieldCheck size={20} style={{ flexShrink: 0 }} />
                    <div>{regSuccessMessage}</div>
                  </div>
                )}

                {signInError && (
                  <div className={styles.errorBanner} role="alert">
                    <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                    <div>{signInError}</div>
                  </div>
                )}

                <form onSubmit={handleSignInSubmit}>
                  {/* Username / Identifier */}
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="signin-username">
                      Patron Identifier or Username
                    </label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}>
                        <UserIcon size={18} />
                      </span>
                      <input
                        id="signin-username"
                        type="text"
                        className={styles.input}
                        placeholder="e.g. username"
                        value={signInIdentifier}
                        onChange={(e) => setSignInIdentifier(e.target.value)}
                        autoComplete="username"
                        required
                        disabled={signInLoading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className={styles.formGroup}>
                    <div className={styles.labelRow}>
                      <label className={styles.label} htmlFor="signin-password">
                        Master Archival Passphrase
                      </label>
                      <button
                        type="button"
                        className={styles.forgotLink}
                        onClick={() => setActiveTab('recover')}
                      >
                        Forgot passphrase?
                      </button>
                    </div>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}>
                        <Lock size={18} />
                      </span>
                      <input
                        id="signin-password"
                        type={showSignInPassword ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="Enter secret passphrase"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        disabled={signInLoading}
                      />
                      <button
                        type="button"
                        className={styles.visibilityToggle}
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        aria-label={showSignInPassword ? 'Hide passphrase' : 'Show passphrase'}
                      >
                        {showSignInPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={signInLoading}
                  >
                    {signInLoading ? (
                      <>
                        <div className={styles.spinner} aria-hidden="true" />
                        <span>Verifying Ledger Entry...</span>
                      </>
                    ) : (
                      <>
                        <span>Authenticate & Enter Sanctuary</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </section>
            )}

            {/* ── TAB 2: REGISTER (INSCRIBE LEDGER) ── */}
            {activeTab === 'register' && (
              <section aria-labelledby="register-heading">
                <div className={styles.formHeader}>
                  <h1 id="register-heading" className={styles.formTitle}>
                    Inscribe Your Name in the Great Ledger
                  </h1>
                  <p className={styles.formSubtitle}>
                    Acquire patron sanctuary privileges, personal reading shelves, and private
                    marginalia logs.
                  </p>
                </div>

                {regError && (
                  <div className={styles.errorBanner} role="alert">
                    <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                    <div>{regError}</div>
                  </div>
                )}

                {managerApplicationSubmitted ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: '#FEF3C7',
                        color: '#D97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem auto',
                      }}
                    >
                      <Clock size={36} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                      Curator Application Under Review
                    </h2>
                    <p style={{ color: '#4B5563', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
                      Your account <strong>{regUsername}</strong> has been registered with Store Manager privileges in{' '}
                      <strong>PENDING</strong> status. An Akashic Administrator will review your publisher/curator
                      credentials before product management is activated.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className={styles.submitButton}
                        onClick={() => {
                          setManagerApplicationSubmitted(false);
                          setSignInIdentifier(regUsername);
                          setActiveTab('signin');
                        }}
                      >
                        <span>Proceed to Sign In</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit}>
                    {/* Account Type Selector */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Account Purpose & Role</label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.75rem',
                          marginTop: '0.35rem',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setRegRole('USER')}
                          style={{
                            padding: '0.85rem 0.75rem',
                            borderRadius: '0.75rem',
                            border: `2px solid ${regRole === 'USER' ? '#FF007A' : 'rgba(0,0,0,0.1)'}`,
                            backgroundColor: regRole === 'USER' ? 'rgba(255,0,122,0.06)' : '#FFFFFF',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                          }}
                          data-testid="role-select-user"
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: regRole === 'USER' ? '#FF007A' : '#111827',
                            }}
                          >
                            📖 Patron / Reader
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>
                            Instant store & library access
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRegRole('STORE_MANAGER')}
                          style={{
                            padding: '0.85rem 0.75rem',
                            borderRadius: '0.75rem',
                            border: `2px solid ${regRole === 'STORE_MANAGER' ? '#FF007A' : 'rgba(0,0,0,0.1)'}`,
                            backgroundColor: regRole === 'STORE_MANAGER' ? 'rgba(255,0,122,0.06)' : '#FFFFFF',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                          }}
                          data-testid="role-select-manager"
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: regRole === 'STORE_MANAGER' ? '#FF007A' : '#111827',
                            }}
                          >
                            🏪 Store Manager
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>
                            Curate & sell (Admin approved)
                          </div>
                        </button>
                      </div>
                    </div>

                    {regRole === 'STORE_MANAGER' && (
                      <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="reg-business-name">
                          Curator / Store Name (Optional)
                        </label>
                        <div className={styles.inputWrapper}>
                          <span className={styles.inputIcon}>
                            <Sparkles size={18} />
                          </span>
                          <input
                            id="reg-business-name"
                            type="text"
                            className={styles.input}
                            placeholder="e.g. Antiquarian Folios & Editions"
                            value={regBusinessName}
                            onChange={(e) => setRegBusinessName(e.target.value)}
                            disabled={regLoading}
                            data-testid="reg-business-name"
                          />
                        </div>
                      </div>
                    )}
                  {/* Patron Handle / Username */}
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="reg-username">
                      Patron Handle (Username)
                    </label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}>
                        <UserIcon size={18} />
                      </span>
                      <input
                        id="reg-username"
                        type="text"
                        className={styles.input}
                        placeholder="e.g. solanas_folio"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        autoComplete="username"
                        required
                        disabled={regLoading}
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="reg-email">
                      Correspondence Address (Email)
                    </label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}>
                        <Mail size={18} />
                      </span>
                      <input
                        id="reg-email"
                        type="email"
                        className={styles.input}
                        placeholder="e.g. patron@bibliotheque.org"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        autoComplete="email"
                        required
                        disabled={regLoading}
                      />
                    </div>
                  </div>

                  {/* Password & Confirmation */}
                  <div className={styles.formRow2}>
                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.label} htmlFor="reg-password">
                        Master Passphrase
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Lock size={18} />
                        </span>
                        <input
                          id="reg-password"
                          type={showRegPassword ? 'text' : 'password'}
                          className={styles.input}
                          placeholder="Min. 8 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                          disabled={regLoading}
                        />
                        <button
                          type="button"
                          className={styles.visibilityToggle}
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          aria-label={showRegPassword ? 'Hide passphrase' : 'Show passphrase'}
                        >
                          {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.label} htmlFor="reg-confirm">
                        Confirm Passphrase
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Lock size={18} />
                        </span>
                        <input
                          id="reg-confirm"
                          type={showRegPassword ? 'text' : 'password'}
                          className={styles.input}
                          placeholder="Repeat passphrase"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                          disabled={regLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Strength Meter */}
                  {regPassword.length > 0 && (
                    <div className={styles.strengthMeter}>
                      <div className={styles.strengthHeader}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Passphrase Strength:</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-action-primary)' }}>
                          {passStrength.label}
                        </span>
                      </div>
                      <div className={styles.strengthBars}>
                        {[1, 2, 3, 4].map((index) => (
                          <div
                            key={index}
                            className={`
                              ${styles.strengthBar}
                              ${index <= passStrength.score ? styles.strengthBarFilled : ''}
                            `}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patron Vow */}
                  <div className={styles.vowBox}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={regAgreedToVow}
                        onChange={(e) => setRegAgreedToVow(e.target.checked)}
                      />
                      <span>
                        I agree to honor the custodial guidelines of the Akashic Library, upholding
                        scholarly inquiry, bibliographic truth, and intellectual privacy.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={regLoading}
                  >
                    {regLoading ? (
                      <>
                        <div className={styles.spinner} aria-hidden="true" />
                        <span>Inscribing Patron Folio...</span>
                      </>
                    ) : (
                      <>
                        <span>Inscribe Patron Ledger</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
                )}
              </section>
            )}

            {/* ── TAB 3: RECOVER FOLIO (FUNCTIONAL SELF-SERVICE RECOVERY) ── */}
            {activeTab === 'recover' && (
              <section aria-labelledby="recover-heading">
                <div className={styles.formHeader}>
                  <h1 id="recover-heading" className={styles.formTitle}>
                    Archival Folio Recovery
                  </h1>
                  <p className={styles.formSubtitle}>
                    Enter your registered patron correspondence address to receive secure folio recovery
                    instructions.
                  </p>
                </div>

                {recoverSuccessMessage && (
                  <div className={styles.successBanner} role="status">
                    <ShieldCheck size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>{recoverSuccessMessage}</p>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                        If an active folio is inscribed under this address, you will find instructions with a
                        secure, time-limited recovery link. Please verify your correspondence.
                      </p>
                    </div>
                  </div>
                )}

                {recoverError && (
                  <div className={styles.errorBanner} role="alert">
                    <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                    <div>{recoverError}</div>
                  </div>
                )}

                {!recoverSuccessMessage ? (
                  <form onSubmit={handleRecoverSubmit}>
                    <div className={styles.formGroup}>
                      <label className={styles.label} htmlFor="recover-email">
                        Registered Correspondence Address (Email)
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Mail size={18} />
                        </span>
                        <input
                          id="recover-email"
                          type="email"
                          className={styles.input}
                          placeholder="patron@domain.org"
                          value={recoverEmail}
                          onChange={(e) => setRecoverEmail(e.target.value)}
                          autoComplete="email"
                          required
                          disabled={recoverLoading}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={recoverLoading}
                    >
                      {recoverLoading ? (
                        <>
                          <div className={styles.spinner} aria-hidden="true" />
                          <span>Dispatching Instructions...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Recovery Link</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>

                    <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.returnLink}
                        onClick={() => setActiveTab('signin')}
                      >
                        <ArrowLeft size={16} />
                        <span>Return to Patron Sign In</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                      type="button"
                      className={styles.submitButton}
                      onClick={() => {
                        setRecoverSuccessMessage(null);
                        setActiveTab('signin');
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Return to Patron Sign In</span>
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ── TAB 4: RENEW PASSPHRASE (CONFIRM RESET WITH TOKEN) ── */}
            {activeTab === 'reset' && (
              <section aria-labelledby="reset-heading">
                <div className={styles.formHeader}>
                  <h1 id="reset-heading" className={styles.formTitle}>
                    Renew Master Passphrase
                  </h1>
                  <p className={styles.formSubtitle}>
                    Inscribe a new secure master passphrase to restore sanctuary entry.
                  </p>
                </div>

                {resetError && (
                  <div className={styles.errorBanner} role="alert">
                    <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                    <div>{resetError}</div>
                  </div>
                )}

                <form onSubmit={handleResetSubmit}>
                  {/* New Passphrase & Confirmation */}
                  <div className={styles.formRow2}>
                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.label} htmlFor="reset-new-password">
                        New Master Passphrase
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Lock size={18} />
                        </span>
                        <input
                          id="reset-new-password"
                          type={showResetPassword ? 'text' : 'password'}
                          className={styles.input}
                          placeholder="Min. 8 characters"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                          disabled={resetLoading}
                        />
                        <button
                          type="button"
                          className={styles.visibilityToggle}
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          aria-label={showResetPassword ? 'Hide passphrase' : 'Show passphrase'}
                        >
                          {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.label} htmlFor="reset-confirm-password">
                        Confirm New Passphrase
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Lock size={18} />
                        </span>
                        <input
                          id="reset-confirm-password"
                          type={showResetPassword ? 'text' : 'password'}
                          className={styles.input}
                          placeholder="Repeat passphrase"
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                          disabled={resetLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Strength Meter */}
                  {resetPassword.length > 0 && (
                    <div className={styles.strengthMeter}>
                      <div className={styles.strengthHeader}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Passphrase Strength:</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-action-primary)' }}>
                          {calculatePasswordStrength(resetPassword).label}
                        </span>
                      </div>
                      <div className={styles.strengthBars}>
                        {[1, 2, 3, 4].map((index) => (
                          <div
                            key={index}
                            className={`
                              ${styles.strengthBar}
                              ${index <= calculatePasswordStrength(resetPassword).score ? styles.strengthBarFilled : ''}
                            `}
                          />
                        ))}
                      </div>
                      <p style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        Passphrase must be at least 8 characters and cannot be a common password, entirely numeric, or too similar to your account details.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <>
                        <div className={styles.spinner} aria-hidden="true" />
                        <span>Renewing Passphrase...</span>
                      </>
                    ) : (
                      <>
                        <span>Save New Master Passphrase</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className={styles.returnLink}
                      onClick={() => setActiveTab('signin')}
                    >
                      <ArrowLeft size={16} />
                      <span>Return to Sign In</span>
                    </button>
                    <button
                      type="button"
                      className={styles.returnLink}
                      onClick={() => setActiveTab('recover')}
                    >
                      <span>Request Fresh Link</span>
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

