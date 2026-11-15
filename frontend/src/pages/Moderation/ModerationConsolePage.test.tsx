import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationConsolePage } from './ModerationConsolePage';
import { useAuth } from '@/context/AuthContext';
import type { AuthContextType } from '@/context/AuthContext';
import type { User } from '@/types/auth';
import * as reportService from '@/services/reportService';
import type { ReportItem } from '@/types/moderation';

vi.mock('@/context/AuthContext');
vi.mock('@/services/reportService');

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
  id: 'usr-default',
  username: 'default_user',
  email: 'user@example.com',
  role: 'USER',
  display_name: 'Default User',
  bio: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const mockReports: ReportItem[] = [
  {
    id: 'rep-001',
    reporter_user_id: 'usr-reporter-1',
    target_type: 'REVIEW',
    target_id: 'rev-001',
    reason: 'SPAM',
    details: 'Repeated promotional message.',
    status: 'PENDING',
    created_at: 1700000000,
    target_content: 'Buy rare folios at discount link http://spam.vault',
    target_author: {
      id: 'usr-bad',
      username: 'spammer',
      display_name: 'Spam Author',
    },
    target_status: 'VISIBLE',
    context: {
      book_id: 'book-123',
      book_title: 'Ficciones',
    },
  },
  {
    id: 'rep-002',
    reporter_user_id: 'usr-reporter-2',
    target_type: 'DISCUSSION',
    target_id: 'disc-002',
    reason: 'HARASSMENT',
    details: 'Attacking another patron.',
    status: 'RESOLVED',
    created_at: 1700000500,
    target_content: 'Inappropriate aggressive comment.',
    target_author: {
      id: 'usr-troll',
      username: 'troll',
      display_name: 'Hostile Reader',
    },
    target_status: 'HIDDEN',
  },
];

const firstReport = mockReports[0]!;

describe('ModerationConsolePage Component', () => {
  const mockOnNavigateHome = vi.fn();
  const mockOnSignInRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unauthenticated sign-in prompt for guest visitors', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: null,
        isAuthenticated: false,
        loading: false,
      })
    );

    render(
      <ModerationConsolePage
        onNavigateHome={mockOnNavigateHome}
        onSignInRequest={mockOnSignInRequest}
      />
    );

    expect(screen.getByTestId('moderation-unauthenticated')).toBeInTheDocument();
    expect(screen.getByText('Curator Sign-In Required')).toBeInTheDocument();

    const signinBtn = screen.getByRole('button', { name: /Sign In with Curator Account/i });
    fireEvent.click(signinBtn);
    expect(mockOnSignInRequest).toHaveBeenCalledTimes(1);
  });

  it('renders access-denied state (403) for regular USER role', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser({ id: 'usr-patron', username: 'patron', role: 'USER' }),
        isAuthenticated: true,
        loading: false,
      })
    );

    render(
      <ModerationConsolePage
        onNavigateHome={mockOnNavigateHome}
        onSignInRequest={mockOnSignInRequest}
      />
    );

    expect(screen.getByTestId('moderation-unauthorized')).toBeInTheDocument();
    expect(screen.getByText('Access Denied (403)')).toBeInTheDocument();
    expect(screen.getByText(/account \(USER\) does not hold curatorial/i)).toBeInTheDocument();

    const homeBtn = screen.getByRole('button', { name: /Return to Library Discovery/i });
    fireEvent.click(homeBtn);
    expect(mockOnNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('renders access-denied state (403) for STORE_MANAGER role', () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser({ id: 'usr-store', username: 'manager', role: 'STORE_MANAGER' }),
        isAuthenticated: true,
        loading: false,
      })
    );

    render(
      <ModerationConsolePage
        onNavigateHome={mockOnNavigateHome}
        onSignInRequest={mockOnSignInRequest}
      />
    );

    expect(screen.getByTestId('moderation-unauthorized')).toBeInTheDocument();
    expect(screen.getByText(/account \(STORE_MANAGER\) does not hold/i)).toBeInTheDocument();
  });

  it('renders full moderation console for MODERATOR role with queue and details', async () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser({
          id: 'usr-mod',
          username: 'curator_elena',
          role: 'MODERATOR',
          display_name: 'Elena Curator',
        }),
        isAuthenticated: true,
        loading: false,
      })
    );

    vi.mocked(reportService.fetchModerationReports).mockResolvedValue(mockReports);
    vi.mocked(reportService.fetchModerationReportDetail).mockResolvedValue(firstReport);
    vi.mocked(reportService.fetchModerationAudits).mockResolvedValue([]);

    render(
      <ModerationConsolePage
        onNavigateHome={mockOnNavigateHome}
        onSignInRequest={mockOnSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('moderator-console-page')).toBeInTheDocument();
      expect(screen.getByText('Moderation Console')).toBeInTheDocument();
      expect(screen.getByTestId('curator-role-badge')).toHaveTextContent('Appointed Curator');
      expect(screen.getByTestId('stat-total-reports')).toHaveTextContent('2');
      expect(screen.getByTestId('report-queue-item-rep-001')).toBeInTheDocument();
      expect(screen.getByTestId('report-detail-view')).toBeInTheDocument();
      expect(screen.getByText('Buy rare folios at discount link http://spam.vault')).toBeInTheDocument();
    });
  });

  it('filters queue by status tabs (e.g. ALL, PENDING, RESOLVED, DISMISSED)', async () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser({ id: 'usr-mod', username: 'curator', role: 'MODERATOR' }),
        isAuthenticated: true,
        loading: false,
      })
    );

    vi.mocked(reportService.fetchModerationReports).mockResolvedValue(mockReports);
    vi.mocked(reportService.fetchModerationReportDetail).mockResolvedValue(firstReport);
    vi.mocked(reportService.fetchModerationAudits).mockResolvedValue([]);

    render(
      <ModerationConsolePage
        onNavigateHome={mockOnNavigateHome}
        onSignInRequest={mockOnSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('filter-tab-all')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('filter-tab-resolved'));

    await waitFor(() => {
      expect(reportService.fetchModerationReports).toHaveBeenCalledWith({
        status: 'RESOLVED',
        target_type: undefined,
      });
    });
  });

  it('resolves a report and updates resolution state', async () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser({ id: 'usr-mod', username: 'curator', role: 'MODERATOR' }),
        isAuthenticated: true,
        loading: false,
      })
    );

    vi.mocked(reportService.fetchModerationReports).mockResolvedValue(mockReports);
    vi.mocked(reportService.fetchModerationReportDetail).mockResolvedValue(firstReport);
    vi.mocked(reportService.fetchModerationAudits).mockResolvedValue([]);
    vi.mocked(reportService.resolveModerationReport).mockResolvedValue({
      ...firstReport,
      status: 'RESOLVED',
      resolution_note: 'Handled by curator',
    });

    render(
      <ModerationConsolePage
        onNavigateHome={mockOnNavigateHome}
        onSignInRequest={mockOnSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('resolve-report-btn')).toBeInTheDocument();
    });

    const noteInput = screen.getByLabelText(/Custodial decision note/i);
    fireEvent.change(noteInput, { target: { value: 'Handled by curator' } });

    fireEvent.click(screen.getByTestId('resolve-report-btn'));

    await waitFor(() => {
      expect(reportService.resolveModerationReport).toHaveBeenCalledWith('rep-001', {
        action: 'RESOLVED',
        note: 'Handled by curator',
      });
    });
  });

  it('opens confirmation modal and soft-hides content', async () => {
    vi.mocked(useAuth).mockReturnValue(
      createMockAuth({
        user: createMockUser({ id: 'usr-admin', username: 'admin', role: 'ADMIN' }),
        isAuthenticated: true,
        loading: false,
      })
    );

    vi.mocked(reportService.fetchModerationReports).mockResolvedValue(mockReports);
    vi.mocked(reportService.fetchModerationReportDetail).mockResolvedValue(firstReport);
    vi.mocked(reportService.fetchModerationAudits).mockResolvedValue([]);
    vi.mocked(reportService.hideContent).mockResolvedValue(undefined);

    render(
      <ModerationConsolePage
        onNavigateHome={mockOnNavigateHome}
        onSignInRequest={mockOnSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('hide-content-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('hide-content-btn'));

    expect(screen.getByTestId('confirm-hide-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-hide-btn'));

    await waitFor(() => {
      expect(reportService.hideContent).toHaveBeenCalledWith('REVIEW', 'rev-001', {
        note: undefined,
        report_id: 'rep-001',
      });
    });
  });
});
