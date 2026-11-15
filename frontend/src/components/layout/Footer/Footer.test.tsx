import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer Component', () => {
  it('renders contentinfo landmark and brand identity', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('Akashic Library')).toBeInTheDocument();
    expect(screen.getByText(/A digital sanctuary for thoughtful discovery/i)).toBeInTheDocument();
  });

  it('renders default link sections', () => {
    render(<Footer />);
    expect(screen.getByRole('heading', { name: /Discovery/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Community/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Akashic/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Search Catalog/i })).toBeInTheDocument();
  });

  it('handles navigation callback when link is clicked', () => {
    const handleNavigate = vi.fn();
    render(<Footer onNavigate={handleNavigate} />);
    const link = screen.getByRole('link', { name: /Search Catalog/i });
    fireEvent.click(link);
    expect(handleNavigate).toHaveBeenCalledWith('#discover');
  });

  it('renders copyright and architectural note', () => {
    render(<Footer />);
    expect(screen.getByText(/An open repository for curious minds/i)).toBeInTheDocument();
    expect(screen.getByText(/Powered by Django REST API/i)).toBeInTheDocument();
  });
});

