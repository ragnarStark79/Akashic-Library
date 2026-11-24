/**
 * Account Settings & Patron Profile Page (Phase 6B)
 *
 * Implements:
 * 1. Safe profile editing (display_name, bio) with AuthContext synchronization.
 * 2. Authenticated master passphrase change with session preservation.
 * 3. Read-only account identity and least-privilege role governance display.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { changePassword, updateUserProfile } from '@/services/authService';
import { getRoleLabel, getRoleDescription } from '@/types/auth';
import styles from './AccountSettingsPage.module.css';

export interface AccountSettingsPageProps {
  onNavigateHome: () => void;
  onNavigateLibrary?: () => void;
  onSignInRequest: () => void;
}

export const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({
  onNavigateHome,
  onNavigateLibrary,
  onSignInRequest,
}) => {
  const { user, isAuthenticated, loading: authLoading, updateProfile } = useAuth();

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Initialize form fields from current user
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
    }
  }, [user]);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      onSignInRequest();
    }
  }, [authLoading, isAuthenticated, onSignInRequest]);

  if (authLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container} style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <div className={styles.spinner} style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-body)' }}>
            Retrieving patron record...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Password Strength Calculation (same 4-tier archival rubric)
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

  const passStrength = calculatePasswordStrength(newPassword);

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    // Validate whitespace-only display name
    if (displayName && !displayName.trim()) {
      setProfileError('Display name cannot consist solely of whitespace.');
      return;
    }

    setProfileSaving(true);
    try {
      if (updateProfile) {
        await updateProfile({
          display_name: displayName.trim(),
          bio: bio.trim(),
        });
      } else {
        await updateUserProfile({
          display_name: displayName.trim(),
          bio: bio.trim(),
        });
      }
      setProfileSuccess('Patron profile updated successfully. Your new identity is active.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile changes.';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  // Reset Profile Form to current user values
  const handleProfileReset = () => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setProfileError(null);
      setProfileSuccess(null);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current master passphrase is required.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New passphrase must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passphrases do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New passphrase cannot be identical to the current passphrase.');
      return;
    }

    setPasswordSaving(true);
    try {
      const resp = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });

      setPasswordSuccess(resp.detail || 'Master passphrase changed successfully. Session preserved.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update passphrase.';
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const initials = (user.display_name || user.username || 'P').slice(0, 2).toUpperCase();
  const inscribedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Archival Record';

  return (
    <div className={styles.page}>
      <div className={styles.ambientBloomTop} aria-hidden="true" />
      <div className={styles.ambientBloomBottom} aria-hidden="true" />

      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <button
            type="button"
            className={styles.returnLink}
            onClick={onNavigateLibrary || onNavigateHome}
            aria-label={onNavigateLibrary ? 'Return to Personal Library' : 'Return to Public Discovery'}
          >
            <ArrowLeft size={16} />
            <span>{onNavigateLibrary ? 'Return to Personal Library' : 'Return to Discovery'}</span>
          </button>

          <span className={styles.registryPill}>
            <Shield size={13} />
            <span>Patron Custody</span>
          </span>
        </div>

        {/* Header Banner Card */}
        <div className={styles.headerCard}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarCircle} aria-hidden="true">
              {initials}
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>Account Settings</h1>
              <p className={styles.pageSubtitle}>
                Manage your patron folio, update display identity, and maintain cryptographic security.
              </p>
            </div>
          </div>

          <div className={styles.headerMeta}>
            <span className={styles.roleBadge}>
              <ShieldCheck size={14} />
              <span>{getRoleLabel(user.role)}</span>
            </span>
            <span className={styles.memberSince}>Inscribed: {inscribedDate}</span>
          </div>
        </div>

        {/* Settings Sections Stack */}
        <div className={styles.settingsStack}>
          {/* SECTION A: Personal Information */}
          <section className={styles.card} aria-labelledby="personal-info-heading">
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} aria-hidden="true">
                <UserIcon size={20} />
              </div>
              <div>
                <h2 id="personal-info-heading" className={styles.cardTitle}>
                  Personal Information
                </h2>
                <p className={styles.cardDescription}>
                  Update the scholarly identity visible to other patrons across reviews, reading annotations,
                  and community dialogues.
                </p>
              </div>
            </div>

            {profileSuccess && (
              <div className={styles.successBanner} role="status">
                <CheckCircle size={20} style={{ flexShrink: 0 }} />
                <div>{profileSuccess}</div>
              </div>
            )}

            {profileError && (
              <div className={styles.errorBanner} role="alert">
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>{profileError}</div>
              </div>
            )}

            <form onSubmit={handleProfileSubmit}>
              {/* Display Name (Editable) */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="profile-display-name">
                  <span>Display Name</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                    Max 200 characters
                  </span>
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <UserIcon size={18} />
                  </span>
                  <input
                    id="profile-display-name"
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Elena Solanas"
                    value={displayName}
                    maxLength={200}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={profileSaving}
                  />
                </div>
                <p className={styles.fieldHint}>
                  Visible in review alcoves, marginalia citations, and discussion threads.
                </p>
              </div>

              {/* Biography (Editable) */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="profile-bio">
                  <span>Reader Biography</span>
                </label>
                <textarea
                  id="profile-bio"
                  className={styles.textarea}
                  placeholder="Tell fellow readers about your scholarly curiosities, favourite genres, or reading philosophies..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={profileSaving}
                />
                <p className={styles.fieldHint}>
                  Optional bibliographic overview presented on your reader folio.
                </p>
              </div>

              {/* Read-Only Identity Fields */}
              <div className={styles.formGrid}>
                {/* Username (Immutable) */}
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label} htmlFor="profile-username">
                    <span>Patron Identifier (Username)</span>
                    <span className={styles.immutableTag}>Immutable</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>
                      <Lock size={16} />
                    </span>
                    <input
                      id="profile-username"
                      type="text"
                      className={`${styles.input} ${styles.inputReadOnly}`}
                      value={user.username}
                      readOnly
                      disabled
                    />
                  </div>
                  <p className={styles.fieldHint}>Unique handle established at ledger inscription.</p>
                </div>

                {/* Email (Read-Only) */}
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label} htmlFor="profile-email">
                    <span>Correspondence Address</span>
                    <span className={styles.immutableTag}>Managed by Desk</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>
                      <Mail size={16} />
                    </span>
                    <input
                      id="profile-email"
                      type="email"
                      className={`${styles.input} ${styles.inputReadOnly}`}
                      value={user.email}
                      readOnly
                      disabled
                    />
                  </div>
                  <p className={styles.fieldHint}>Official address for folio recovery correspondence.</p>
                </div>
              </div>

              {/* Profile Actions */}
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleProfileReset}
                  disabled={profileSaving}
                >
                  <RotateCcw size={16} />
                  <span>Reset Changes</span>
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <>
                      <div className={styles.spinner} aria-hidden="true" />
                      <span>Saving Folio...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* SECTION B: Security & Password Management */}
          <section className={styles.card} aria-labelledby="security-heading">
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} aria-hidden="true">
                <Lock size={20} />
              </div>
              <div>
                <h2 id="security-heading" className={styles.cardTitle}>
                  Master Passphrase & Security
                </h2>
                <p className={styles.cardDescription}>
                  Change your master passphrase. Your current active session will be preserved while all
                  other client sessions will be invalidated.
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className={styles.successBanner} role="status">
                <CheckCircle size={20} style={{ flexShrink: 0 }} />
                <div>{passwordSuccess}</div>
              </div>
            )}

            {passwordError && (
              <div className={styles.errorBanner} role="alert">
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>{passwordError}</div>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              {/* Current Passphrase */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="current-password">
                  Current Master Passphrase
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <Lock size={18} />
                  </span>
                  <input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className={styles.input}
                    placeholder="Enter existing passphrase"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={passwordSaving}
                  />
                  <button
                    type="button"
                    className={styles.visibilityToggle}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide current passphrase' : 'Show current passphrase'}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Passphrase & Confirmation */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label} htmlFor="new-password">
                    New Master Passphrase
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>
                      <Lock size={18} />
                    </span>
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      disabled={passwordSaving}
                    />
                    <button
                      type="button"
                      className={styles.visibilityToggle}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide new passphrase' : 'Show new passphrase'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label} htmlFor="confirm-new-password">
                    Confirm New Passphrase
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>
                      <Lock size={18} />
                    </span>
                    <input
                      id="confirm-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="Repeat new passphrase"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      disabled={passwordSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Strength Meter */}
              {newPassword.length > 0 && (
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
                  <p style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    Passphrase must be at least 8 characters and cannot be a common password, entirely numeric, or too similar to your patron identifier.
                  </p>
                </div>
              )}

              {/* Password Actions */}
              <div className={styles.actionRow}>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={passwordSaving}
                >
                  {passwordSaving ? (
                    <>
                      <div className={styles.spinner} aria-hidden="true" />
                      <span>Updating Passphrase...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Save New Passphrase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* SECTION C: Account Identity & Custodial Role */}
          <section className={`${styles.card} ${styles.roleCard}`} aria-labelledby="role-governance-heading">
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} aria-hidden="true">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 id="role-governance-heading" className={styles.cardTitle}>
                  Account Identity & Role Governance
                </h2>
                <p className={styles.cardDescription}>
                  Akashic Library enforces strict role-based access control and principle of least privilege.
                </p>
              </div>
            </div>

            <div className={styles.roleDetails}>
              <div className={styles.roleHeader}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active Custodial Role
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    {getRoleLabel(user.role)}
                  </div>
                </div>

                <div className={styles.rolePillActive}>
                  <ShieldCheck size={14} />
                  <span>Verified: {user.role}</span>
                </div>
              </div>

              <div className={styles.permissionNotice}>
                <strong>Application Permissions:</strong>
                <p style={{ margin: '6px 0 0 0' }}>{getRoleDescription(user.role)}</p>
              </div>

              <p className={styles.securityNote}>
                <strong>Security Policy:</strong> Patron roles cannot be escalated or modified through
                self-service profile requests. Elevated administrative and curatorial privileges are assigned
                strictly via authenticated custodial command consoles to prevent privilege escalation.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
