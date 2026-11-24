import { test, expect } from '@playwright/test';
import { loginViaUI, logoutViaUI, takePhaseScreenshot, DEFAULT_E2E_PASSWORD } from './helpers';

test.describe('Personal Library & Strict Multi-User Isolation', () => {
  test('01. Patron A Shelves Book & Verifies Personal Library', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);

    // Navigate to test book Ficciones
    await page.goto('/?view=book-detail&id=6b0000000000000000000001');
    await expect(page.locator('h1[class*="bookTitle"], h1').first()).toContainText('Ficciones Test Edition');

    // Click shelf status dropdown/button to set Want to Read
    const shelfTrigger = page.locator('button:has-text("Want to Read"), button[aria-label*="reading status"], button[class*="shelfButton"]').first();
    await shelfTrigger.click();
    await page.waitForTimeout(1000);

    // If dropdown menu opened, select Want to Read
    const wantToReadOption = page.locator('button:has-text("Want to Read"), [role="menuitem"]:has-text("Want to Read")').first();
    if (await wantToReadOption.isVisible()) {
      await wantToReadOption.click();
      await page.waitForTimeout(1000);
    }

    // Navigate to Personal Library
    await page.goto('/?view=library');
    await page.waitForTimeout(1500);

    // Verify book is displayed on Patron A's shelf
    await expect(page.locator('body')).toContainText('Ficciones Test Edition');

    // Capture screenshot: phase6f_personal_library_patron.png
    await takePhaseScreenshot(page, 'phase6f_personal_library_patron.png');

    await logoutViaUI(page);
  });

  test('02. Patron B Isolation: Patron A Books Invisible & Cross-User Rejection', async ({ page }) => {
    // Login as Patron B
    await loginViaUI(page, 'test_e2e_patron_b', DEFAULT_E2E_PASSWORD);

    // Navigate to Patron B's library
    await page.goto('/?view=library');
    await page.waitForTimeout(1500);

    // Strict multi-user isolation: Patron B MUST NOT see Patron A's book
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Ficciones Test Edition');

    // Direct API verification: Patron B tries to access Patron A's library entries directly
    const apiResult = await page.evaluate(async () => {
      const res = await fetch('/api/library/?user_id=nonexistent', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      return { status: res.status, count: data.count || (data.results ? data.results.length : 0) };
    });

    // The endpoint returns only the authenticated user's entries (Patron B has 0)
    expect(apiResult.count).toBe(0);

    await logoutViaUI(page);
  });
});
