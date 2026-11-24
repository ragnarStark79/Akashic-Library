import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreGiftingPage } from './StoreGiftingPage';

describe('StoreGiftingPage', () => {
  it('renders the gifting hero headline and gift now button', () => {
    const onNavigateStore = vi.fn();
    render(<StoreGiftingPage onNavigateStore={onNavigateStore} />);

    expect(
      screen.getByText(/A gift so good you’re going to want to borrow it/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('hero-gift-now-btn')).toBeInTheDocument();
  });

  it('renders the subscription plans and toggles between USA and Canada pricing', () => {
    const onNavigateStore = vi.fn();
    render(<StoreGiftingPage onNavigateStore={onNavigateStore} />);

    // Default USA pricing
    expect(screen.getByText('$37.99')).toBeInTheDocument();
    expect(screen.getByText('$113.99')).toBeInTheDocument();
    expect(screen.getByText('$227.99')).toBeInTheDocument();
    expect(screen.getByText('$455.99')).toBeInTheDocument();

    // Toggle to Canada
    const canadaBtn = screen.getByRole('button', { name: 'Canada' });
    fireEvent.click(canadaBtn);

    expect(screen.getByText('$53.99')).toBeInTheDocument();
    expect(screen.getByText('$161.99')).toBeInTheDocument();
    expect(screen.getByText('$323.99')).toBeInTheDocument();
    expect(screen.getByText('$647.99')).toBeInTheDocument();
  });

  it('renders all 3 editorial feature rows', () => {
    const onNavigateStore = vi.fn();
    render(<StoreGiftingPage onNavigateStore={onNavigateStore} />);

    expect(screen.getByText('They pick their own books')).toBeInTheDocument();
    expect(screen.getByText('Exclusive hardcovers')).toBeInTheDocument();
    expect(screen.getByText('Join the community!')).toBeInTheDocument();
  });

  it('renders the Gifting FAQ with accordion expand/collapse', () => {
    const onNavigateStore = vi.fn();
    render(<StoreGiftingPage onNavigateStore={onNavigateStore} />);

    expect(screen.getByText('Gifting FAQ')).toBeInTheDocument();
    expect(
      screen.getByText('What does a gift subscription include?')
    ).toBeInTheDocument();
    expect(
      screen.getByText('How do I give a subscription?')
    ).toBeInTheDocument();

    // Click to toggle second FAQ
    const faq2Trigger = screen.getByText('How do I give a subscription?');
    fireEvent.click(faq2Trigger);

    expect(
      screen.getByText(/When you buy a gift subscription you are instantly emailed an e-gift card/i)
    ).toBeInTheDocument();
  });

  it('shows toast when gifting a plan', () => {
    const onNavigateStore = vi.fn();
    render(<StoreGiftingPage onNavigateStore={onNavigateStore} />);

    const giftBtn = screen.getByTestId('gift-btn-sub-3m');
    fireEvent.click(giftBtn);

    expect(
      screen.getByText(/Selected 3-Month Subscription/i)
    ).toBeInTheDocument();
  });
});
