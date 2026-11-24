import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreNavButton } from './StoreNavButton';

describe('StoreNavButton Component', () => {
  it('renders button with accessible aria-label matching label', () => {
    render(<StoreNavButton label="All Books" />);

    const button = screen.getByRole('button', { name: 'All Books' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'All Books');
  });

  it('splits label into individual character spans with aria-hidden for accessibility', () => {
    const { container } = render(<StoreNavButton label="FAQ" />);

    const splitChars = Array.from(container.querySelectorAll('[data-char]'));
    expect(splitChars.length).toBe(3);
    expect(splitChars[0]?.textContent).toBe('F');
    expect(splitChars[1]?.textContent).toBe('A');
    expect(splitChars[2]?.textContent).toBe('Q');

    const buttonText = container.querySelector('[aria-hidden="true"]');
    expect(buttonText).toBeInTheDocument();
  });

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<StoreNavButton label="Gifting" onClick={handleClick} />);

    const button = screen.getByRole('button', { name: 'Gifting' });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('sets aria-current="page" when isActive is true', () => {
    render(<StoreNavButton label="Merch" isActive={true} />);

    const button = screen.getByRole('button', { name: 'Merch' });
    expect(button).toHaveAttribute('aria-current', 'page');
  });

  it('handles mouse enter, mouse leave, focus, and blur events gracefully', () => {
    render(<StoreNavButton label="Library Sanctuary" />);

    const button = screen.getByRole('button', { name: 'Library Sanctuary' });
    expect(() => {
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
      fireEvent.focus(button);
      fireEvent.blur(button);
    }).not.toThrow();
  });
});
