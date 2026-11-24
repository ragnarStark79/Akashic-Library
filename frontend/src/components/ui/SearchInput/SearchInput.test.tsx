import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from './SearchInput';

describe('SearchInput Primitive', () => {
  it('renders with placeholder and accessible role', () => {
    render(<SearchInput placeholder="Search catalog..." />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search catalog...')).toBeInTheDocument();
  });

  it('triggers onClear callback when clear button is clicked', () => {
    const handleClear = vi.fn();
    render(<SearchInput value="Frank Herbert" onChange={() => {}} onClear={handleClear} />);
    const clearButton = screen.getByRole('button', { name: /clear search query/i });
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('clears query on Escape key press', () => {
    const handleClear = vi.fn();
    render(<SearchInput value="Asimov" onChange={() => {}} onClear={handleClear} />);
    const input = screen.getByRole('searchbox');
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
