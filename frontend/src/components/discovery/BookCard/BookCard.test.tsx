import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookCard } from './BookCard';
import type { BookListItem } from '../../../types/discovery';

const mockBook: BookListItem = {
  id: 'b-101',
  title: 'Ficciones',
  authors: ['Jorge Luis Borges'],
  published_date: '1944',
  language: 'es',
  rating: 4.8,
  review_count: 124,
  cover_url: 'https://example.com/ficciones.jpg',
};

const mockBookNoCover: BookListItem = {
  id: 'b-102',
  title: 'Labyrinths',
  authors: ['Jorge Luis Borges'],
  published_date: '1962',
  language: 'en',
  review_count: 0,
};

describe('BookCard Component', () => {
  it('renders book title, author, and metadata', () => {
    render(<BookCard book={mockBook} />);
    expect(screen.getByText('Ficciones')).toBeInTheDocument();
    expect(screen.getByText('Jorge Luis Borges')).toBeInTheDocument();
    expect(screen.getByText('1944')).toBeInTheDocument();
    expect(screen.getByText('ES')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('renders cover image when cover_url is provided', () => {
    render(<BookCard book={mockBook} />);
    const img = screen.getByRole('img', { name: /Cover jacket for Ficciones/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/ficciones.jpg');
  });

  it('renders fallback cover when cover_url is absent', () => {
    render(<BookCard book={mockBookNoCover} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Akashic')).toBeInTheDocument();
    // Fallback title displayed inside the stylized cover
    const fallbackTitles = screen.getAllByText('Labyrinths');
    expect(fallbackTitles.length).toBeGreaterThanOrEqual(1);
  });

  it('switches to fallback cover when image error occurs', () => {
    render(<BookCard book={mockBook} />);
    const img = screen.getByRole('img', { name: /Cover jacket for Ficciones/i });
    fireEvent.error(img);
    expect(screen.getByText('Akashic')).toBeInTheDocument();
  });

  it('calls onSelect when article is clicked', () => {
    const handleSelect = vi.fn();
    render(<BookCard book={mockBook} onSelect={handleSelect} />);
    const card = screen.getByRole('article');
    fireEvent.click(card);
    expect(handleSelect).toHaveBeenCalledWith(mockBook);
  });

  it('calls onSelect when pressing Enter or Space key', () => {
    const handleSelect = vi.fn();
    render(<BookCard book={mockBook} onSelect={handleSelect} />);
    const card = screen.getByRole('article');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith(mockBook);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleSelect).toHaveBeenCalledTimes(2);
  });

  it('renders horizontal layout variant with details button', () => {
    render(<BookCard book={mockBook} layout="horizontal" />);
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('applies imageFit="contain" class to cover image', () => {
    render(<BookCard book={mockBook} imageFit="contain" />);
    const img = screen.getByRole('img', { name: /Cover jacket for Ficciones/i });
    expect(img.className).toMatch(/coverImageContain/);
  });

  it('forwards custom className to article element', () => {
    render(<BookCard book={mockBook} className="custom-carousel-card" />);
    const card = screen.getByRole('article');
    expect(card.className).toContain('custom-carousel-card');
  });
});
