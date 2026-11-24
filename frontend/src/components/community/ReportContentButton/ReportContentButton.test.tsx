import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportContentButton } from './ReportContentButton';
import { useAuth } from '@/context/AuthContext';
import type { AuthContextType } from '@/context/AuthContext';
import type { User } from '@/types/auth';

vi.mock('@/context/AuthContext');

const createMockAuth = (overrides?: Partial<AuthContextType>): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn().mockResolvedValue(null),
  intendedDestination: null,
  setIntendedDestination: vi.fn(),
  ...overrides,
});

const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'usr-1',
  username: 'patron_a',
  email: 'patron_a@example.com',
  role: 'USER',
  display_name: 'Patron A',
  bio: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('ReportContentButton Component', () => {
  const mockOnSignInRequest = vi.fn();
  const mockOnReportSubmitted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report button for another patron content', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser(),
        isAuthenticated: true,
      })
    );

    render(
      <ReportContentButton
        targetType="REVIEW"
        targetId="rev-456"
        authorId="usr-2"
        authorName="Patron B"
      />
    );

    const btn = screen.getByRole('button', { name: /Report review by Patron B/i });
    expect(btn).toBeInTheDocument();
  });

  it('does NOT render report button on user own content (self-report prevention)', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser(),
        isAuthenticated: true,
      })
    );

    render(
      <ReportContentButton
        targetType="REVIEW"
        targetId="rev-own"
        authorId="usr-1"
        authorName="Patron A"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('triggers onSignInRequest when clicked by unauthenticated guest', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: null,
        isAuthenticated: false,
      })
    );

    render(
      <ReportContentButton
        targetType="DISCUSSION"
        targetId="disc-999"
        authorId="usr-author"
        authorName="Patron C"
        onSignInRequest={mockOnSignInRequest}
      />
    );

    const btn = screen.getByRole('button', { name: /Report discussion by Patron C/i });
    fireEvent.click(btn);

    expect(mockOnSignInRequest).toHaveBeenCalledTimes(1);
  });

  it('opens ReportContentModal when clicked by authenticated patron', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser(),
        isAuthenticated: true,
      })
    );

    render(
      <ReportContentButton
        targetType="ANNOTATION"
        targetId="annot-111"
        authorId="usr-2"
        authorName="Patron D"
        onReportSubmitted={mockOnReportSubmitted}
      />
    );

    const btn = screen.getByRole('button', { name: /Report annotation by Patron D/i });
    fireEvent.click(btn);

    expect(screen.getByRole('dialog', { name: /Report Content/i })).toBeInTheDocument();
  });
});
