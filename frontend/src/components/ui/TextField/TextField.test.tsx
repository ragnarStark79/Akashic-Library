import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextField } from './TextField';

describe('TextField Primitive', () => {
  it('associates label with input via htmlFor/id', () => {
    render(<TextField label="Username" id="user-field" />);
    const input = screen.getByLabelText('Username');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'user-field');
  });

  it('renders error message and marks input aria-invalid', () => {
    render(
      <TextField
        label="Email"
        errorMessage="Please enter a valid academic email."
      />
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Please enter a valid academic email.');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('-error'));
  });

  it('renders helper text when not in error state', () => {
    render(
      <TextField
        label="Author ID"
        helperText="Enter 10-digit Library of Congress number."
      />
    );
    expect(
      screen.getByText('Enter 10-digit Library of Congress number.')
    ).toBeInTheDocument();
  });
});

