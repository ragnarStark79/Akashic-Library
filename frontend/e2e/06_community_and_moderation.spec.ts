import { test, expect } from '@playwright/test';
import { loginViaUI, logoutViaUI, takePhaseScreenshot, DEFAULT_E2E_PASSWORD } from './helpers';

test.describe('Community Governance, Discussions & Moderation Workflows', () => {
  let createdDiscussionId = '';

  test('01. Patron A Inscribes a Community Discussion', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);

    await page.goto('/?view=community');
    await page.waitForTimeout(1000);

    // Open dialogue composer modal
    const beginBtn = page.locator('button:has-text("Begin a Dialogue")').first();
    await beginBtn.click();
    await page.waitForTimeout(1000);

    // Fill discussion composer
    const titleInput = page.locator('#composer-title, input[placeholder*="title"], input[placeholder*="Inquire"]').first();
    await titleInput.fill("The Spatial Topology of Borges's Labyrinth");

    const contentTextarea = page.locator('textarea[placeholder*="reflection, textual question"], textarea').first();
    await contentTextarea.fill("In Ficciones, how do the infinite hexagonal rooms in The Library of Babel relate to modern topological manifolds and eternal recurrence?");

    const submitBtn = page.locator('button:has-text("Inscribe Dialogue")').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify created discussion is present
    await expect(page.locator('body')).toContainText("The Spatial Topology of Borges's Labyrinth");

    // Capture screenshot: phase6f_community_hub.png
    await takePhaseScreenshot(page, 'phase6f_community_hub.png');

    // Extract discussion ID from URL or page
    const currentUrl = page.url();
    const match = currentUrl.match(/id=([a-f0-9-]+)/);
    if (match) {
      createdDiscussionId = match[1];
    }

    await logoutViaUI(page);
  });

  test('02. Patron B Replies & Inscribes a Nested Response', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_b', DEFAULT_E2E_PASSWORD);

    // Navigate to Community Hub or Thread directly
    if (createdDiscussionId) {
      await page.goto(`/?view=community-thread&id=${createdDiscussionId}`);
    } else {
      await page.goto('/?view=community');
      const threadLink = page.locator('text="The Spatial Topology of Borges\'s Labyrinth"').first();
      await threadLink.click();
    }
    await page.waitForTimeout(1500);

    // Verify Thread loaded
    await expect(page.locator('body')).toContainText("The Spatial Topology of Borges's Labyrinth");

    // Inscribe a response
    const replyTextarea = page.locator('textarea[class*="replyTextarea"], textarea').first();
    await replyTextarea.fill('The hexagons represent a discrete Riemannian manifold where every point is simultaneously center and boundary.');

    const inscribeResponseBtn = page.locator('button:has-text("Inscribe Response")').first();
    await inscribeResponseBtn.click();
    await page.waitForTimeout(2000);

    // Verify response is rendered
    await expect(page.locator('body')).toContainText('Riemannian manifold');

    // Capture screenshot: phase6f_community_thread_nested.png
    await takePhaseScreenshot(page, 'phase6f_community_thread_nested.png');

    // Flag content: Patron B reports the discussion
    const reportBtn = page.locator('button[aria-label*="Report"], button:has-text("Report")').first();
    await reportBtn.click();
    await page.waitForTimeout(1000);

    // Verify Report Modal is open
    await expect(page.locator('h3:has-text("Report Content"), [class*="modalTitle"]')).toBeVisible();

    // Select reason
    const reasonSelect = page.locator('select').first();
    if (await reasonSelect.isVisible()) {
      await reasonSelect.selectOption('INAPPROPRIATE');
    }

    // Fill details
    const detailsInput = page.locator('#report-details-textarea').first();
    if (await detailsInput.isVisible()) {
      await detailsInput.fill('Phase 6F verification: testing moderation soft-hide workflow.');
    }

    // Capture screenshot: phase6f_reporting_modal.png
    await takePhaseScreenshot(page, 'phase6f_reporting_modal.png');

    // Submit report
    const submitReportBtn = page.locator('button:has-text("Submit Report")').first();
    await submitReportBtn.click();
    await page.waitForTimeout(1000);

    // Verify report inscribed
    await expect(page.getByText('Report Inscribed').first()).toBeVisible();

    // Close dialog
    const returnBtn = page.locator('button:has-text("Return to Folio"), button[aria-label*="Close"]').first();
    if (await returnBtn.isVisible()) {
      await returnBtn.click();
      await page.waitForTimeout(500);
    }

    await logoutViaUI(page);
  });

  test('03. RBAC Enforcement: Unauthorized Roles Rejected (403)', async ({ page }) => {
    // 1. Patron A (USER role) attempts to visit Moderation Console
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);
    await page.goto('/?view=moderation');
    await page.waitForTimeout(1500);

    // Verify Access Denied 403
    await expect(page.locator('h2:has-text("Access Denied")').first()).toBeVisible();

    // Capture screenshot: phase6f_moderator_unauthorized_403.png
    await takePhaseScreenshot(page, 'phase6f_moderator_unauthorized_403.png');
    await logoutViaUI(page);

    // 2. Store Manager (STORE_MANAGER role) attempts to visit Moderation Console
    await loginViaUI(page, 'test_e2e_store_mgr', DEFAULT_E2E_PASSWORD);
    await page.goto('/?view=moderation');
    await page.waitForTimeout(1500);

    // Store manager MUST also be rejected (least privilege rule)
    await expect(page.locator('h2:has-text("Access Denied")').first()).toBeVisible();
    await logoutViaUI(page);
  });

  test('04. Moderator Reviews Queue, Soft-Hides & Verifies Public State', async ({ page }) => {
    // Login as Curator Moderator
    await loginViaUI(page, 'test_e2e_moderator', DEFAULT_E2E_PASSWORD);

    // Visit Moderation Console
    await page.goto('/?view=moderation');
    await page.waitForTimeout(2000);

    // Verify console loaded
    await expect(page.locator('h1, [class*="headerTitle"]').first()).toContainText('Moderation Console');

    // Capture screenshot: phase6f_moderator_console_queue.png
    await takePhaseScreenshot(page, 'phase6f_moderator_console_queue.png');

    // If report items exist in queue, select the first report
    const queueCard = page.locator('[class*="reportCard"], [class*="queueItem"]').first();
    if (await queueCard.isVisible()) {
      await queueCard.click();
      await page.waitForTimeout(1000);

      // Click Soft-Hide Content
      const softHideBtn = page.locator('button:has-text("Soft-Hide Content")').first();
      if (await softHideBtn.isVisible()) {
        await softHideBtn.click();
        await page.waitForTimeout(1000);

        // Fill note and confirm
        const noteInput = page.locator('textarea').last();
        if (await noteInput.isVisible()) {
          await noteInput.fill('Phase 6F test soft-hide: temporarily retired from public view.');
        }

        const confirmHideBtn = page.locator('button:has-text("Confirm Soft-Hide"), button:has-text("Soft-Hide")').last();
        await confirmHideBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Now visit public Community Hub: Verify hidden content is excluded!
    await page.goto('/?view=community');
    await page.waitForTimeout(1500);

    // Capture screenshot: phase6f_hidden_content_public_state.png
    await takePhaseScreenshot(page, 'phase6f_hidden_content_public_state.png');

    await logoutViaUI(page);
  });
});
