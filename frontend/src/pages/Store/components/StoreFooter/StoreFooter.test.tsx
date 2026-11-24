import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreFooter } from './StoreFooter';

describe('StoreFooter Component', () => {
  it('renders footer brand, description, "Open to everyone." badge, and return sanctuary button', () => {
    const handleExit = vi.fn();
    render(
      <StoreFooter
        onNavigate={vi.fn()}
        onExitPortalToLibrary={handleExit}
      />
    );

    expect(screen.getByText('Akashic Store')).toBeInTheDocument();
    expect(
      screen.getByText(/An artisanal marketplace for physical book editions/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('store-open-badge')).toHaveTextContent(/Open to everyone\./i);

    const returnBtn = screen.getByTestId('return-sanctuary-btn');
    fireEvent.click(returnBtn);
    expect(handleExit).toHaveBeenCalledTimes(1);
  });

  it('navigates to store sections on click and triggers sanctuary return', () => {
    const handleNavigate = vi.fn();
    const handleExit = vi.fn();
    render(
      <StoreFooter
        onNavigate={handleNavigate}
        onExitPortalToLibrary={handleExit}
      />
    );

    fireEvent.click(screen.getByTestId('footer-link-all-books'));
    expect(handleNavigate).toHaveBeenCalledWith('store-allbooks');

    fireEvent.click(screen.getByTestId('footer-link-merch'));
    expect(handleNavigate).toHaveBeenCalledWith('store-merch');

    fireEvent.click(screen.getByTestId('footer-link-common-questions'));
    expect(handleNavigate).toHaveBeenCalledWith('store-faq');

    fireEvent.click(screen.getByTestId('footer-link-sanctuary-home'));
    expect(handleExit).toHaveBeenCalledTimes(1);
  });

  it('renders central floating physical book visual', () => {
    render(
      <StoreFooter
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
      />
    );

    const bookVisual = screen.getByTestId('footer-book-visual');
    expect(bookVisual).toBeInTheDocument();
    expect(bookVisual.querySelector('img')).toBeInTheDocument();
  });

  it('validates email input client-side and shows success message on valid submission', () => {
    render(
      <StoreFooter
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
      />
    );

    const emailInput = screen.getByTestId('newsletter-email-input');
    const submitBtn = screen.getByTestId('newsletter-submit-btn');

    // Submit with empty email
    fireEvent.click(submitBtn);
    expect(screen.getByTestId('newsletter-error-msg')).toHaveTextContent(/Please enter your email address/i);

    // Submit with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitBtn);
    expect(screen.getByTestId('newsletter-error-msg')).toHaveTextContent(/Please enter a valid email address/i);

    // Submit with valid email
    fireEvent.change(emailInput, { target: { value: 'patron@akashic.local' } });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('newsletter-success-msg')).toHaveTextContent(
      /Welcome to our circle! You’ve joined the Akashic mailing list\./i
    );
  });

  it('renders bottom legal strip with dynamic copyright year and back to top button', () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <StoreFooter
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
      />
    );

    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${currentYear} Akashic Store\\. All rights reserved\\.`, 'i'))
    ).toBeInTheDocument();

    const backToTopBtn = screen.getByTestId('footer-back-to-top');
    fireEvent.click(backToTopBtn);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('does NOT render app-download buttons or social media icons', () => {
    const { container } = render(
      <StoreFooter
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/download on the app store/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/get it on google play/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/instagram/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/tiktok/i)).not.toBeInTheDocument();
    expect(container.querySelectorAll('.button-social')).toHaveLength(0);
  });
});
