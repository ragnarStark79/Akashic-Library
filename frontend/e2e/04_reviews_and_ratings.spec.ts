import { test, expect } from '@playwright/test';
import { loginViaUI, logoutViaUI, takePhaseScreenshot, DEFAULT_E2E_PASSWORD } from './helpers';

test.describe('Book Reviews, Ratings & Threaded Replies', () => {
  test('01. Patron A Inscribes a Review', async ({ page }) => {
    await loginViaUI(page, 'test_e2e_patron_a', DEFAULT_E2E_PASSWORD);

    // Navigate to Book Reviews view
    await page.goto('/?view=book-reviews&id=6b0000000000000000000001');
    await page.waitForTimeout(1000);

    // Pick 5 stars
    const starBtn = page.locator('button[aria-label="5 stars"], button[aria-label*="5 star"]').first();
    await starBtn.waitFor({ state: 'visible', timeout: 10000 });
    await starBtn.click();

    // Fill Review Title
    const titleInput = page.locator('input[placeholder*="summary"], input[placeholder*="headline"], input[type="text"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('An Infinite Labyrinth of Literary Genius');
    }

    // Fill Review Content
    const contentTextarea = page.locator('textarea[placeholder*="thematic architecture"], textarea[placeholder*="curiosities"], textarea').first();
    await contentTextarea.fill('Ficciones represents the pinnacle of philosophical parables and speculative storytelling. Every story invites profound rereading.');

    // Click Submit
    const submitBtn = page.locator('button:has-text("Submit Contemplation for Archival Review"), button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify review is present
    await expect(page.locator('body')).toContainText('An Infinite Labyrinth of Literary Genius');
    await expect(page.locator('body')).toContainText('Ficciones represents the pinnacle');

    // Capture screenshot: phase6f_book_reviews_public.png
    await takePhaseScreenshot(page, 'phase6f_book_reviews_public.png');

    await logoutViaUI(page);
  });

  test('02. Patron B Views Review & Posts a Reply', async ({ page }) => {
    // Login as Patron B
    await loginViaUI(page, 'test_e2e_patron_b', DEFAULT_E2E_PASSWORD);

    // Navigate to Book Reviews view
    await page.goto('/?view=book-reviews&id=6b0000000000000000000001');
    await page.waitForTimeout(1000);

    // Verify Patron A review is visible
    await expect(page.locator('body')).toContainText('An Infinite Labyrinth of Literary Genius');

    // Click Reply on Patron A's review
    const replyTrigger = page.locator('button:has-text("Reply")').first();
    await replyTrigger.click();

    // Fill Reply text
    const replyTextarea = page.locator('textarea[aria-label="Reply text"]').first();
    await replyTextarea.fill('I wholeheartedly agree with your assessment of Borges’s labyrinths!');

    // Post Reply
    const postReplyBtn = page.locator('button:has-text("Post Reply")').first();
    await postReplyBtn.click();
    await page.waitForTimeout(1500);

    // Verify reply appears
    await expect(page.locator('body')).toContainText('I wholeheartedly agree with your assessment');

    // Ownership check: Patron B cannot edit or delete Patron A's review
    const editReviewBtn = page.locator('button[aria-label*="Edit review"], button:has-text("Edit Review")');
    expect(await editReviewBtn.count()).toBe(0);

    await logoutViaUI(page);
  });
});
