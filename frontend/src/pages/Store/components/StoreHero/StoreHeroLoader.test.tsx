import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StoreHeroLoader } from './StoreHeroLoader';

describe('StoreHeroLoader Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading status landmark with brand identity', () => {
    const onCompleteMock = vi.fn();

    render(<StoreHeroLoader onComplete={onCompleteMock} minDurationMs={500} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Akashic Store')).toBeInTheDocument();
    expect(screen.getByText(/Curating Editions & Folios/i)).toBeInTheDocument();
  });

  it('completes loading and invokes callback after duration', async () => {
    const onCompleteMock = vi.fn();

    render(<StoreHeroLoader onComplete={onCompleteMock} minDurationMs={300} />);

    expect(onCompleteMock).not.toHaveBeenCalled();

    // Advance timers past minimum duration and transition fade
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });
});
