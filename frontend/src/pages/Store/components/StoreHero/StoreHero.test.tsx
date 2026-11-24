import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreHero } from './StoreHero';

describe('StoreHero Component', () => {
  it('renders hero editorial headline and content', () => {
    render(<StoreHero />);

    expect(
      screen.getByRole('heading', {
        name: 'Stories worth keeping. Worlds worth unboxing.',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Discover thoughtfully selected books/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Curated archival folios delivered to your door/i)
    ).toBeInTheDocument();
  });

  it('renders primary and secondary CTA buttons and triggers callbacks', () => {
    const onExploreMock = vi.fn();
    const onEditionsMock = vi.fn();

    render(
      <StoreHero
        onExploreClick={onExploreMock}
        onEditionsClick={onEditionsMock}
      />
    );

    const exploreBtn = screen.getByRole('button', {
      name: 'Explore the Collection',
    });
    const editionsBtn = screen.getByRole('button', {
      name: 'Discover Akashic Editions',
    });

    expect(exploreBtn).toBeInTheDocument();
    expect(editionsBtn).toBeInTheDocument();

    fireEvent.click(exploreBtn);
    expect(onExploreMock).toHaveBeenCalledTimes(1);

    fireEvent.click(editionsBtn);
    expect(onEditionsMock).toHaveBeenCalledTimes(1);
  });

  it('does not render the oversized foreground package visual, preserving the floating books as primary', () => {
    render(<StoreHero />);

    // Package visual must be absent from hero foreground
    expect(screen.queryByAltText('Akashic Store Curated Package')).toBeNull();

    // Rotating stamp seal accent remains intact
    const stamp = screen.getByTitle('Curated Editions — Akashic Store');
    expect(stamp).toBeInTheDocument();

    const heroSection = screen.getByTestId('store-hero-section');
    expect(heroSection).toBeInTheDocument();
  });

  it('renders background canvas container and 3D books container', () => {
    render(<StoreHero />);

    expect(
      screen.getByTestId('store-hero-canvas-container')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('store-hero-ambient-canvas')
    ).toBeInTheDocument();
  });
});
