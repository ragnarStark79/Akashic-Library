import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterDrawer } from './FilterDrawer';

describe('FilterDrawer Component', () => {
  const defaultFilters = {
    subject: '',
    language: '',
    year_from: undefined,
    year_to: undefined,
  };

  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterDrawer
        isOpen={false}
        onClose={handleClose}
        filters={defaultFilters}
        onApply={handleApply}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders filter sections when open', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterDrawer
        isOpen={true}
        onClose={handleClose}
        filters={defaultFilters}
        onApply={handleApply}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Filter Archives')).toBeInTheDocument();
    expect(screen.getByText('Discipline / Category')).toBeInTheDocument();
    expect(screen.getByText('Language Expression')).toBeInTheDocument();
    expect(screen.getByText('Publication Year Range')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterDrawer
        isOpen={true}
        onClose={handleClose}
        filters={defaultFilters}
        onApply={handleApply}
      />
    );
    const closeBtn = screen.getByRole('button', { name: /Close filter drawer/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterDrawer
        isOpen={true}
        onClose={handleClose}
        filters={defaultFilters}
        onApply={handleApply}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows selecting filters and calls onApply with updated values', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterDrawer
        isOpen={true}
        onClose={handleClose}
        filters={defaultFilters}
        onApply={handleApply}
      />
    );

    // Select Philosophy (exact match to distinguish from Natural Philosophy & Cosmology)
    const philosophyBtn = screen.getByRole('button', { name: /^Philosophy$/i });
    fireEvent.click(philosophyBtn);

    // Select Spanish
    const spanishBtn = screen.getByRole('button', { name: /Spanish/i });
    fireEvent.click(spanishBtn);

    // Enter year range
    const fromInput = screen.getByLabelText(/Publication year from/i);
    fireEvent.change(fromInput, { target: { value: '1940' } });

    const toInput = screen.getByLabelText(/Publication year to/i);
    fireEvent.change(toInput, { target: { value: '1980' } });

    // Click Apply Filters
    const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith({
      page: 1,
      subject: 'Philosophy',
      language: 'es',
      year_from: 1940,
      year_to: 1980,
    });
  });

  it('resets selections when Reset All is clicked and applied', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterDrawer
        isOpen={true}
        onClose={handleClose}
        filters={{ subject: 'Philosophy', language: 'en', year_from: 1920, year_to: 1950 }}
        onApply={handleApply}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset All/i });
    fireEvent.click(resetBtn);

    const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith({
      page: 1,
      subject: undefined,
      language: undefined,
      year_from: undefined,
      year_to: undefined,
    });
  });
});
