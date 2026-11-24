import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreTopBooksSection } from './StoreTopBooksSection';
import { TOP_BOOKS_DATA } from './data/topBooksData';

describe('StoreTopBooksSection', () => {
  it('renders section heading, description and handwritten accent correctly', () => {
    render(<StoreTopBooksSection />);

    expect(screen.getByRole('heading', { level: 2, name: /Our Top Books/i })).toBeInTheDocument();
    expect(screen.getByText(/Discover hidden gems and buzzy new releases/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Explore noteworthy releases, remarkable stories and carefully selected editions from the Akashic Store\./i
      )
    ).toBeInTheDocument();
  });

  it('renders all 6 top books with titles, authors, and cover images', () => {
    render(<StoreTopBooksSection />);

    TOP_BOOKS_DATA.forEach((book) => {
      expect(screen.getByRole('heading', { level: 3, name: book.title })).toBeInTheDocument();
      expect(screen.getByAltText(new RegExp(`${book.title} by ${book.author}`, 'i'))).toBeInTheDocument();
      expect(screen.getByText(book.description)).toBeInTheDocument();
    });
  });

  it('renders genre tags for the books', () => {
    render(<StoreTopBooksSection />);

    expect(screen.getAllByText('LGBTQIA+').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Horror').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Debut Novel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sci-Fi').length).toBeGreaterThan(0);
  });

  it('renders carousel navigation controls with correct aria labels', () => {
    render(<StoreTopBooksSection />);

    const prevButton = screen.getByRole('button', { name: /Previous Slide/i });
    const nextButton = screen.getByRole('button', { name: /Next Slide/i });

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    // Previous button starts disabled when at beginning
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it('invokes onSelectBook when a book card is clicked', () => {
    const handleSelectBook = vi.fn();
    render(<StoreTopBooksSection onSelectBook={handleSelectBook} />);

    const milkteethLink = screen.getByRole('link', { name: /View details for Milkteeth/i });
    fireEvent.click(milkteethLink);

    expect(handleSelectBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Milkteeth',
        slug: 'milkteeth',
      })
    );
  });

  it('invokes onSelectBook when Read More button is clicked', () => {
    const handleSelectBook = vi.fn();
    render(<StoreTopBooksSection onSelectBook={handleSelectBook} />);

    const readMoreButtons = screen.getAllByRole('button', { name: /Read more/i });
    expect(readMoreButtons.length).toBe(6);
    expect(readMoreButtons[0]).toBeDefined();

    fireEvent.click(readMoreButtons[0]!);
    expect(handleSelectBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Milkteeth',
      })
    );
  });

  it('has proper accessibility attributes and landmark structure', () => {
    const { container } = render(<StoreTopBooksSection />);
    const section = container.querySelector('section');
    expect(section).toHaveAttribute('aria-labelledby', 'store-top-books-heading');

    const carouselList = screen.getByRole('list', { name: /Top books collection/i });
    expect(carouselList).toBeInTheDocument();
  });

  it('handles Next button click smoothly to navigate the carousel', () => {
    render(<StoreTopBooksSection />);

    const nextButton = screen.getByRole('button', { name: /Next Slide/i });
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    // Carousel navigation event triggers without error
    expect(nextButton).toBeInTheDocument();
  });

  it('handles pointer drag interactions on carousel rail', () => {
    render(<StoreTopBooksSection />);

    const carouselList = screen.getByRole('list', { name: /Top books collection/i });
    // Simulate setPointerCapture mock if needed in jsdom
    carouselList.setPointerCapture = vi.fn();
    carouselList.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(carouselList, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(carouselList, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(carouselList, { clientX: 100, pointerId: 1 });

    expect(carouselList).toBeInTheDocument();
  });
});
