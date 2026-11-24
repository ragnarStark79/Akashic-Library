import { test, expect } from '@playwright/test';
import { takePhaseScreenshot } from './helpers';

test.describe('Discovery, Search & Legal Access Classifications', () => {
  test('01. Discovery Home, Search and Filtering', async ({ page }) => {
    // 1. Visit Home
    await page.goto('/?view=discover');
    await expect(page.locator('h1, [class*="heroTitle"]')).toContainText('Every book opens a new universe');

    // 2. Perform search
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('Ficciones');
    await searchInput.press('Enter');

    // Wait for Search results
    await page.waitForTimeout(1500);
    await takePhaseScreenshot(page, 'phase6f_home_search.png');
  });

  test('02. Genre Browsing and Genre Detail Navigation', async ({ page }) => {
    await page.goto('/?view=genres');
    await page.waitForTimeout(1000);
    
    // Check that genre cards are present
    const genreCards = page.locator('[class*="genreCard"], [class*="card"]');
    await expect(genreCards.first()).toBeVisible();

    // Navigate to a genre detail view
    await page.goto('/?view=genre-detail&genre=Fiction');
    await page.waitForTimeout(1000);
    await takePhaseScreenshot(page, 'phase6f_genre_book_detail.png');
  });

  test('03. Book Details and All Six Legal Access Classifications', async ({ page }) => {
    // Navigate to our seeded test book: Ficciones Test Edition
    await page.goto('/?view=book-detail&id=6b0000000000000000000001');
    
    // Verify book header
    await expect(page.locator('h1[class*="bookTitle"], h1').first()).toContainText('Ficciones Test Edition');
    await expect(page.locator('body')).toContainText('Jorge Luis Borges');

    // Verify all 6 Access Classifications in Preservation Ledger / Access Options
    const bodyText = await page.locator('body').innerText();
    
    // 1. OUR_STORE (Akashic Bookstore / Part I Archive Record)
    expect(bodyText).toMatch(/Akashic Bookstore|Akashic Store/i);
    expect(bodyText).toMatch(/Part I Archive Record/i);

    // 2. EXTERNAL_PURCHASE (Retail Edition / Independent Booksellers Guild)
    expect(bodyText).toMatch(/Retail Edition|Independent Booksellers Guild/i);

    // 3. PREVIEW (Digital Preview / Google Books)
    expect(bodyText).toMatch(/Digital Preview|Google Books/i);

    // 4. BORROW (Library Lending / Internet Archive)
    expect(bodyText).toMatch(/Library Lending|Borrow Digital Edition|Internet Archive/i);

    // 5. PUBLIC_DOMAIN (Public Domain / Standard Ebooks Archive)
    expect(bodyText).toMatch(/Public Domain|Standard Ebooks Archive/i);

    // 6. INFORMATION (Scholarly Record / Open Library)
    expect(bodyText).toMatch(/Scholarly Record|Open Library Bibliographic Record/i);

    // Verify Kindred Explorations is rendered
    expect(bodyText).toMatch(/Kindred Explorations/i);

    // Scroll to access options area and capture screenshot
    const accessHeading = page.locator('text=Preservation Ledger, text=Access Options, text=Legal Access Pathways, text=Akashic Bookstore').first();
    if (await accessHeading.isVisible()) {
      await accessHeading.scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(1000);
    await takePhaseScreenshot(page, 'phase6f_book_detail_access_options.png');
  });
});
