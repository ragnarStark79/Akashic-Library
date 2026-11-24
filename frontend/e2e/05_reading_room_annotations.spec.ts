import { test, expect } from '@playwright/test';
import { loginViaUI, logoutViaUI, takePhaseScreenshot, DEFAULT_E2E_PASSWORD } from './helpers';

test.describe('Reading Room, Annotation Persistence & Strict Privacy Boundaries', () => {
  test('01. Patron A Inscribes Private and Shared Marginalia', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);

    // Navigate to Reading Room
    await page.goto('/?view=reading-room&id=6b0000000000000000000001');
    await page.waitForTimeout(1000);

    // 1. Create PRIVATE annotation (default is Private)
    const privateOption = page.locator('button:has-text("Private Reflection")').first();
    if (await privateOption.isVisible()) {
      await privateOption.click();
    }

    const textarea = page.locator('#reflection-text-input, textarea[placeholder*="Transcribe your contemplation"]').first();
    await textarea.fill('Patron A Private Secret: In the Garden of Forking Paths, time branches infinitely.');

    const inscribePrivateBtn = page.locator('button:has-text("Inscribe to Reading Desk"), button[type="submit"]').first();
    await inscribePrivateBtn.click();
    await page.waitForTimeout(1500);

    // Verify private annotation is listed
    await expect(page.locator('body')).toContainText('Patron A Private Secret');

    // 2. Create SHARED annotation
    const sharedOption = page.locator('button:has-text("Shared Marginalia")').first();
    await sharedOption.click();

    await textarea.fill('Patron A Shared Marginalia: The library is a sphere whose exact center is any hexagon.');
    const publishSharedBtn = page.locator('button:has-text("Publish Shared Marginalia"), button[type="submit"]').first();
    await publishSharedBtn.click();
    await page.waitForTimeout(1500);

    // Verify shared annotation is listed
    await expect(page.locator('body')).toContainText('Patron A Shared Marginalia');

    // Capture screenshot: phase6f_reading_room_patron_a.png
    await takePhaseScreenshot(page, 'phase6f_reading_room_patron_a.png');

    await logoutViaUI(page);
  });

  test('02. Patron B Privacy Boundary: Private Invisible, Shared Visible', async ({ page }) => {
    // Login as Patron B
    await loginViaUI(page, 'test_e2e_patron_b', DEFAULT_E2E_PASSWORD);

    // Navigate to Reading Room for same book
    await page.goto('/?view=reading-room&id=6b0000000000000000000001');
    await page.waitForTimeout(1500);

    // Switch to Shared Marginalia tab
    const sharedTab = page.locator('button[role="tab"]:has-text("Shared"), button:has-text("Shared (")').first();
    await sharedTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.locator('body').innerText();

    // 1. Shared marginalia MUST be visible
    expect(bodyText).toContain('Patron A Shared Marginalia');

    // 2. CRITICAL PRIVACY ENFORCEMENT: Private note MUST NOT be visible!
    expect(bodyText).not.toContain('Patron A Private Secret');

    // 3. Ownership protection: Patron B cannot edit or delete Patron A's marginalia
    const deleteBtn = page.locator('button[aria-label*="Delete annotation"], button:has-text("Delete Annotation")');
    expect(await deleteBtn.count()).toBe(0);

    // Capture screenshot: phase6f_reading_room_patron_b.png
    await takePhaseScreenshot(page, 'phase6f_reading_room_patron_b.png');

    await logoutViaUI(page);
  });
});
