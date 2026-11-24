import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchModal } from './SearchModal';

describe('SearchModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(<SearchModal isOpen={false} onClose={vi.fn()} onSearchSubmit={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog, title, and auto-focused search input when isOpen is true', () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} onSearchSubmit={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /Search the Custodial Archives/i });
    expect(dialog).toBeDefined();

    const input = screen.getByRole('searchbox', { name: /Search catalog folios/i });
    expect(input).toBeDefined();
    expect(input).toHaveAttribute('placeholder', 'Search titles, authors, ISBNs, subjects...');
  });

  it('allows user to type into the search field and clear it', () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} onSearchSubmit={vi.fn()} />);
    const input = screen.getByRole('searchbox', { name: /Search catalog folios/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Borges' } });
    expect(input.value).toBe('Borges');

    const clearBtn = screen.getByRole('button', { name: /Clear search input/i });
    fireEvent.click(clearBtn);
    expect(input.value).toBe('');
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(<SearchModal isOpen={true} onClose={handleClose} onSearchSubmit={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop or close button is clicked', () => {
    const handleClose = vi.fn();
    render(<SearchModal isOpen={true} onClose={handleClose} onSearchSubmit={vi.fn()} />);

    const closeBtn = screen.getByRole('button', { name: /Close search dialog/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId('search-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('does not submit when search query is empty or whitespace', () => {
    const handleSubmit = vi.fn();
    render(<SearchModal isOpen={true} onClose={vi.fn()} onSearchSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /Search Catalog/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(submitBtn);
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits query and selected scope when form is submitted', () => {
    const handleSubmit = vi.fn();
    const handleClose = vi.fn();
    render(<SearchModal isOpen={true} onClose={handleClose} onSearchSubmit={handleSubmit} />);

    const input = screen.getByRole('searchbox', { name: /Search catalog folios/i });
    fireEvent.change(input, { target: { value: 'Ficciones' } });

    // Select Title scope
    const titleScopeBtn = screen.getByRole('radio', { name: /Title/i });
    fireEvent.click(titleScopeBtn);

    const form = screen.getByRole('search');
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledWith('Ficciones', 'title');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

