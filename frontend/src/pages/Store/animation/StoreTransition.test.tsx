import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { StoreTransitionOverlay } from '../components/StoreTransition/StoreTransitionOverlay';
import { useStoreTransition } from './useStoreTransition';

describe('StoreTransition Components & Hooks', () => {
  it('renders transition overlay when entering store', () => {
    render(
      <StoreTransitionOverlay
        stage="entering"
        targetExperience="store"
      />
    );

    expect(screen.getByRole('status', { name: 'Entering Akashic Store' })).toBeInTheDocument();
    expect(screen.getByText('Akashic Store')).toBeInTheDocument();
    expect(screen.getByText('Sanctuary Marketplace')).toBeInTheDocument();
  });

  it('renders transition overlay when returning to library', () => {
    render(
      <StoreTransitionOverlay
        stage="exiting"
        targetExperience="library"
      />
    );

    expect(screen.getByRole('status', { name: 'Returning to Akashic Library' })).toBeInTheDocument();
    expect(screen.getByText('Akashic Library')).toBeInTheDocument();
    expect(screen.getByText('Digital Sanctuary')).toBeInTheDocument();
  });

  it('does not display logo badge when stage is idle', () => {
    render(
      <StoreTransitionOverlay
        stage="idle"
        targetExperience="store"
      />
    );

    expect(screen.queryByText('Akashic Store')).not.toBeInTheDocument();
  });

  it('progresses hook stages from idle to entering and back to idle', () => {
    vi.useFakeTimers();
    const handleTransitionToStore = vi.fn();

    const { result } = renderHook(() =>
      useStoreTransition({
        onTransitionToStore: handleTransitionToStore,
      })
    );

    expect(result.current.stage).toBe('idle');

    act(() => {
      result.current.triggerPortalToStore('store');
    });

    expect(result.current.stage).toBe('entering');
    expect(result.current.targetExperience).toBe('store');

    // Fast-forward to midpoint
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(handleTransitionToStore).toHaveBeenCalledWith('store');

    // Fast-forward to completion
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.stage).toBe('idle');

    vi.useRealTimers();
  });
});
