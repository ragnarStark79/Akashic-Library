import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SCREENSHOTS_DIR = path.resolve(
  __dirname,
  '../../docs/Frontend_Docs/screenshots/phase6f'
);

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

export async function takePhaseScreenshot(page: Page, filename: string) {
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  // Also keep a copy at parent screenshots directory for backwards compatibility
  const parentFilePath = path.join(path.dirname(SCREENSHOTS_DIR), filename);
  fs.copyFileSync(filePath, parentFilePath);
}

export const DEFAULT_E2E_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2eDisposablePass_2026!';

export async function loginViaUI(page: Page, username: string, pass: string = DEFAULT_E2E_PASSWORD) {
  await page.goto('/?view=auth&tab=signin');
  const userInput = page.locator('input[placeholder*="username"], input[id*="username"], input[type="text"]').first();
  await userInput.waitFor({ state: 'visible', timeout: 10000 });
  const passInput = page.locator('input[placeholder*="passphrase"], input[type="password"]').first();
  
  await userInput.fill(username);
  await passInput.fill(pass);
  
  const submitBtn = page.locator('button:has-text("Authenticate & Enter Sanctuary"), button[type="submit"]').first();
  await submitBtn.click();
  
  // Wait for login redirection / profile avatar in navbar
  await page.waitForSelector('[class*="avatarInitials"], button:has-text("Sign Out"), [class*="userDropdownButton"]', { timeout: 15000 });
}

export async function logoutViaUI(page: Page) {
  // If user dropdown is open or avatar is visible
  const avatar = page.locator('[class*="avatarInitials"], button[aria-label*="Account"], [class*="userDropdownButton"]').first();
  if (await avatar.isVisible()) {
    await avatar.click();
    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Sign out"), [class*="signOut"]').first();
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}
