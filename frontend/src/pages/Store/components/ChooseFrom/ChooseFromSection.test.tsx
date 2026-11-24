import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChooseFromSection } from './ChooseFromSection';
import {
  CATEGORIES,
  getCategoryJitter,
  getCategoryCoverImage,
  DEFAULT_CATEGORY_JITTER,
  CATEGORY_JITTERS,
} from './data/categoryData';
import styles from './ChooseFromSection.module.css';

describe('ChooseFromSection Component', () => {
  it('renders section title and handwritten annotation', () => {
    render(<ChooseFromSection />);
    expect(screen.getByRole('heading', { name: /choose from/i })).toBeInTheDocument();
    expect(screen.getByText(/we've got a book for every kind of reader/i)).toBeInTheDocument();
  });

  it('renders all 11 category labels', () => {
    render(<ChooseFromSection />);
    CATEGORIES.forEach((cat) => {
      const items = screen.getAllByText(cat.label);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('calls onSelectCategory when a category item is clicked', () => {
    const handleSelectCategory = vi.fn();
    render(<ChooseFromSection onSelectCategory={handleSelectCategory} />);

    const horrorButton = screen.getByTestId('category-item-horror');
    fireEvent.click(horrorButton);

    expect(handleSelectCategory).toHaveBeenCalledTimes(1);
    expect(handleSelectCategory).toHaveBeenCalledWith(CATEGORIES[0]);
  });

  it('toggles easter egg popup and triggers onSignUpClick', () => {
    const handleSignUpClick = vi.fn();
    render(<ChooseFromSection onSignUpClick={handleSignUpClick} />);

    // Popup is initially closed
    expect(screen.queryByTestId('choose-from-easter-egg-popup')).not.toBeInTheDocument();

    // Click trigger button
    const trigger = screen.getByTestId('choose-from-easter-egg-trigger');
    fireEvent.click(trigger);

    // Popup is now visible
    expect(screen.getByTestId('choose-from-easter-egg-popup')).toBeInTheDocument();
    expect(screen.getByText(/want to join the club\?/i)).toBeInTheDocument();

    // Click signup button inside popup
    const signUpBtn = screen.getByTestId('easter-egg-signup-button');
    fireEvent.click(signUpBtn);

    expect(handleSignUpClick).toHaveBeenCalledTimes(1);
  });

  it('prevents rapid hover oscillation between adjacent genres (Romance and Thriller)', () => {
    const { container } = render(<ChooseFromSection />);
    const romanceBtn = screen.getByTestId('category-item-romance');
    const thrillerBtn = screen.getByTestId('category-item-thriller');

    // Hover Romance
    fireEvent.pointerEnter(romanceBtn);
    const wrap = container.querySelector('[data-active]');
    expect(wrap).toHaveAttribute('data-active', 'true');

    let imgs = wrap?.querySelectorAll('img') || [];
    // Exactly 4 floating covers rendered
    expect(imgs.length).toBe(4);
    const romanceSrcs = Array.from(imgs).map((img) => (img as HTMLImageElement).src);

    // Rapidly switch to Thriller
    fireEvent.pointerEnter(thrillerBtn);
    imgs = wrap?.querySelectorAll('img') || [];
    expect(imgs.length).toBe(4);
    const thrillerSrcs = Array.from(imgs).map((img) => (img as HTMLImageElement).src);

    // Thriller images are different from Romance images
    expect(thrillerSrcs).not.toEqual(romanceSrcs);

    // Rapidly switch back to Romance
    fireEvent.pointerEnter(romanceBtn);
    imgs = wrap?.querySelectorAll('img') || [];
    expect(imgs.length).toBe(4);

    // Leave list
    const listWrap = container.querySelector('[data-active]');
    fireEvent.pointerLeave(listWrap!);
    expect(listWrap).toHaveAttribute('data-active', 'false');
    imgs = wrap?.querySelectorAll('img') || [];
    expect(imgs.length).toBe(0);
  });

  it('has proper accessibility landmarks and attributes', () => {
    render(<ChooseFromSection />);
    const section = screen.getByTestId('choose-from-section');
    expect(section).toHaveAttribute('aria-label', 'Choose from book categories');
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders Contemporary Fiction with single-line desktop markup', () => {
    render(<ChooseFromSection />);
    const item = screen.getByTestId('category-item-contemporary-fiction');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent(/contemporary fiction/i);
    const spans = item.querySelectorAll('span');
    expect(spans.length).toBeGreaterThanOrEqual(2);
    expect(spans[0]).toHaveTextContent('Contemporary Fiction');
  });

  it('handles category enter and leave cleanly under prefers-reduced-motion', () => {
    // Mock reduced motion
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<ChooseFromSection />);
    const horrorBtn = screen.getByTestId('category-item-horror');

    // Enter category
    fireEvent.pointerEnter(horrorBtn);
    const images = container.querySelectorAll(`img.${styles.genreImg}`);
    expect(images.length).toBeGreaterThanOrEqual(1);

    // Leave list
    const listWrap = container.querySelector(`.${styles.genreListWrap}`);
    expect(listWrap).toBeInTheDocument();
    fireEvent.pointerLeave(listWrap!);
  });

  it('renders exactly 4 book covers with valid sources when hovering Horror', () => {
    const { container } = render(<ChooseFromSection />);
    const horrorBtn = screen.getByTestId('category-item-horror');

    fireEvent.pointerEnter(horrorBtn);
    const images = container.querySelectorAll(`img.${styles.genreImg}`);
    expect(images.length).toBe(4);
    images.forEach((img) => {
      const src = (img as HTMLImageElement).getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).not.toBe('');
    });
  });

  it('switches cleanly between Fantasy and Science Fiction without rendering both simultaneously', () => {
    const { container } = render(<ChooseFromSection />);
    const fantasyBtn = screen.getByTestId('category-item-fantasy');
    const scifiBtn = screen.getByTestId('category-item-science-fiction');

    // Hover Fantasy
    fireEvent.pointerEnter(fantasyBtn);
    let images = container.querySelectorAll(`img.${styles.genreImg}`);
    expect(images.length).toBe(4);
    const fantasySrcs = Array.from(images).map((img) => (img as HTMLImageElement).src);

    // Switch to Sci-Fi
    fireEvent.pointerEnter(scifiBtn);
    images = container.querySelectorAll(`img.${styles.genreImg}`);
    // Exactly 4 images rendered (never 8)
    expect(images.length).toBe(4);
    const scifiSrcs = Array.from(images).map((img) => (img as HTMLImageElement).src);
    expect(scifiSrcs).not.toEqual(fantasySrcs);
  });

  it('supports keyboard focus triggering category covers preview', () => {
    const { container } = render(<ChooseFromSection />);
    const thrillerBtn = screen.getByTestId('category-item-thriller');

    fireEvent.focus(thrillerBtn);
    const images = container.querySelectorAll(`img.${styles.genreImg}`);
    expect(images.length).toBe(4);
  });

  it('provides organic, distinct jitter values across all categories and uses safe fallback for invalid indices', () => {
    // Valid lookups return non-zero organic offsets
    const horrorJit0 = getCategoryJitter(0, 0);
    const horrorJit1 = getCategoryJitter(0, 1);
    const firstRow = CATEGORY_JITTERS[0];
    expect(firstRow).toBeDefined();
    if (firstRow) {
      expect(horrorJit0).toEqual(firstRow[0]);
    }
    // Different holders have distinct coordinates
    expect(horrorJit0).not.toEqual(horrorJit1);

    // Negative index uses fallback
    expect(getCategoryJitter(-1, 0)).toEqual(DEFAULT_CATEGORY_JITTER);
    // Null index uses fallback
    expect(getCategoryJitter(null, 0)).toEqual(DEFAULT_CATEGORY_JITTER);
    // Out-of-bounds category index uses fallback
    expect(getCategoryJitter(999, 0)).toEqual(DEFAULT_CATEGORY_JITTER);
    // Out-of-bounds holder index uses fallback
    expect(getCategoryJitter(0, 99)).toEqual(DEFAULT_CATEGORY_JITTER);

    // getCategoryCoverImage returns null for invalid index
    expect(getCategoryCoverImage(0, null)).toBeNull();
    expect(getCategoryCoverImage(0, -1)).toBeNull();
    expect(getCategoryCoverImage(0, 999)).toBeNull();
  });
});
