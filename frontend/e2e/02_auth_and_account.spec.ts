import { test, expect } from '@playwright/test';
import { loginViaUI, logoutViaUI, takePhaseScreenshot, DEFAULT_E2E_PASSWORD } from './helpers';

test.describe('Authentication, Session Persistence & Account Settings', () => {
  test('01. Authenticate Patron A & Verify Session Persistence Across Reload', async ({ page }) => {
    // Sign in as test_e2e_patron_a
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);

    // Verify Patron Alpha avatar initials or profile
    const avatar = page.locator('[class*="avatarInitials"], button:has-text("PA"), button[aria-label*="Account"]').first();
    await expect(avatar).toBeVisible();

    // Reload page to verify session persistence
    await page.reload();
    await expect(page.locator('[class*="avatarInitials"], button:has-text("PA"), button[aria-label*="Account"]').first()).toBeVisible();
  });

  test('02. Account Settings View & Profile Update', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);
    await page.goto('/?view=account-settings');

    // Verify account settings loaded
    await expect(page.locator('h1, [class*="title"]').first()).toContainText('Account Settings');
    await expect(page.locator('input[readonly]').first()).toHaveValue('test_e2e_patron_a');
    await expect(page.locator('body')).toContainText('Registered Patron');
    await expect(page.locator('body')).toContainText('USER');

    // Capture screenshot: phase6f_account_settings_patron.png
    await page.waitForTimeout(1000);
    await takePhaseScreenshot(page, 'phase6f_account_settings_patron.png');

    // Update bio
    const bioTextarea = page.locator('textarea').first();
    await bioTextarea.fill('Updated bio: wandering through the infinite library of Babel.');

    const saveProfileBtn = page.locator('button:has-text("Save Profile Changes")');
    await saveProfileBtn.click();

    // Verify success banner/alert
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator('textarea').first()).toHaveValue('Updated bio: wandering through the infinite library of Babel.');
  });

  test('03. Password Policy Validation Enforcement', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);
    await page.goto('/?view=account-settings');

    // The Master Passphrase section is directly on the page
    const currentPassInput = page.locator('input[placeholder*="Current"], input[name="currentPassword"], input[type="password"]').nth(0);
    const newPassInput = page.locator('input[placeholder*="New"], input[name="newPassword"], input[type="password"]').nth(1);
    const confirmPassInput = page.locator('input[placeholder*="Confirm"], input[name="confirmPassword"], input[type="password"]').nth(2);

    await currentPassInput.fill(DEFAULT_E2E_PASSWORD);
    await newPassInput.fill('short');
    await confirmPassInput.fill('short');

    const savePassBtn = page.locator('button:has-text("Save New Passphrase")');
    await savePassBtn.click();

    // Verify error is shown
    await expect(page.getByRole('alert')).toContainText('at least 8 characters');
  });

  test('04. Logout Workflow', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);
    await logoutViaUI(page);

    // Verify unauthenticated state: Sign In link is visible
    await expect(page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first()).toBeVisible();
  });
});
