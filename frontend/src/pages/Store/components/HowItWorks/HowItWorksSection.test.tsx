import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { HowItWorksSection } from './HowItWorksSection';
import { HOW_IT_WORKS_STEPS } from './data/howItWorksData';

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

describe('HowItWorksSection Component', () => {
  it('renders section headline, handwritten annotation, and seal', () => {
    render(<HowItWorksSection />);

    expect(screen.getByRole('heading', { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/consider us your professional book curator/i)).toBeInTheDocument();
    expect(screen.getByAltText(/akashic seal icon/i)).toBeInTheDocument();
  });

  it('renders all four illustrated step cards with exact copy', () => {
    render(<HowItWorksSection />);

    HOW_IT_WORKS_STEPS.forEach((item) => {
      const card = screen.getByTestId(`how-it-works-card-${item.id}`);
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent(item.step);
      expect(card).toHaveTextContent(item.title);
      expect(card).toHaveTextContent(item.description);
    });
  });

  it('renders "Become a member" CTA and triggers callback on click', () => {
    const onBecomeMemberMock = vi.fn();
    render(<HowItWorksSection onBecomeMemberClick={onBecomeMemberMock} />);

    const button = screen.getByTestId('become-a-member-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/become a member/i);

    fireEvent.click(button);
    expect(onBecomeMemberMock).toHaveBeenCalledTimes(1);
  });

  it('renders organic background SVGs', () => {
    const { container } = render(<HowItWorksSection />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('has list role and accessible items', () => {
    render(<HowItWorksSection />);
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('handles card hover interaction and pointer enter across all 4 steps', () => {
    const { container } = render(<HowItWorksSection />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);

    // Hover step 1
    fireEvent.pointerEnter(items[0]!);
    // Hover step 2
    fireEvent.pointerEnter(items[1]!);
    // Hover step 3
    fireEvent.pointerEnter(items[2]!);
    // Hover step 4
    fireEvent.pointerEnter(items[3]!);

    // Hover back from step 4 directly to step 1
    fireEvent.pointerEnter(items[0]!);

    // Rapid switching between non-adjacent cards
    fireEvent.pointerEnter(items[0]!);
    fireEvent.pointerEnter(items[3]!);
    fireEvent.pointerEnter(items[1]!);
    fireEvent.pointerEnter(items[3]!);
    fireEvent.pointerEnter(items[0]!);

    // Mouse leave container
    const calloutContainer = container.querySelector('[data-call-out]');
    expect(calloutContainer).toBeInTheDocument();
    fireEvent.mouseLeave(calloutContainer!);

    // Re-enter after leave
    fireEvent.pointerEnter(items[2]!);
    fireEvent.mouseLeave(calloutContainer!);
  });

  it('handles mouse move tracking on flowList container', () => {
    const { container } = render(<HowItWorksSection />);
    const calloutContainer = container.querySelector('[data-call-out]');
    expect(calloutContainer).toBeInTheDocument();

    vi.spyOn(calloutContainer!, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 1000,
      height: 400,
      right: 1100,
      bottom: 500,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    // Move across slices
    fireEvent.mouseMove(calloutContainer!, { clientX: 300 });
    fireEvent.mouseMove(calloutContainer!, { clientX: 600 });
    fireEvent.mouseMove(calloutContainer!, { clientX: 850 });
    fireEvent.mouseMove(calloutContainer!, { clientX: 1050 });
    // Move outside bounds (< 0)
    fireEvent.mouseMove(calloutContainer!, { clientX: 50 });

    fireEvent.mouseLeave(calloutContainer!);
  });
});
