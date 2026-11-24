import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { WhyAkashicSection } from './WhyAkashicSection';
import { WHY_AKASHIC_CAPSULES } from './data/whyAkashicData';

// Mock matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('WhyAkashicSection Component', () => {
  it('renders section headline, curved SVG title, and Akashic seal logo', () => {
    render(<WhyAkashicSection />);

    const section = screen.getByTestId('why-akashic-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute(
      'aria-label',
      'Why Akashic - Store Features and Member Values'
    );

    // Arched title
    expect(screen.getByText('Why Akashic?')).toBeInTheDocument();

    // Central Brand Seal
    expect(screen.getByLabelText(/akashic store brand seal/i)).toBeInTheDocument();
  });

  it('renders all 5 feature capsules with exact truthful copy and styling', () => {
    render(<WhyAkashicSection />);

    expect(WHY_AKASHIC_CAPSULES).toHaveLength(5);

    WHY_AKASHIC_CAPSULES.forEach((capsule) => {
      const el = screen.getByTestId(`why-akashic-capsule-${capsule.id}`);
      expect(el).toBeInTheDocument();
      expect(el).toHaveTextContent(capsule.text);
      expect(el).toHaveStyle({ backgroundColor: capsule.backgroundColor });
      expect(el).toHaveStyle({ color: capsule.textColor });
    });
  });

  it('triggers onExploreClick callback when capsule is clicked', () => {
    const onExploreMock = vi.fn();
    render(<WhyAkashicSection onExploreClick={onExploreMock} />);

    const firstCapsule = screen.getByTestId('why-akashic-capsule-genres');
    fireEvent.click(firstCapsule);

    expect(onExploreMock).toHaveBeenCalledTimes(1);
  });

  it('renders layered decorative wave background SVGs', () => {
    render(<WhyAkashicSection />);
    const bgContainer = screen.getByTestId('why-akashic-bg');
    expect(bgContainer).toBeInTheDocument();

    const svgs = bgContainer.querySelectorAll('svg');
    expect(svgs.length).toBe(2); // desktop + mobile SVGs
  });

  it('respects prefers-reduced-motion media query', () => {
    // Simulate reduced motion
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<WhyAkashicSection />);
    expect(container.querySelector('[data-benefits]')).toBeInTheDocument();
  });

  it('handles pointermove and pointerleave without throwing errors', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('pointer: fine'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<WhyAkashicSection />);
    const section = container.querySelector('[data-benefits]');
    expect(section).toBeInTheDocument();

    fireEvent.pointerMove(section!, { clientX: 300, clientY: 200 });
    fireEvent.pointerMove(section!, { clientX: 450, clientY: 350 });
    fireEvent.pointerLeave(section!);
  });
});
