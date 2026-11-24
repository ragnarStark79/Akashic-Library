import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportContentModal } from './ReportContentModal';
import * as reportService from '@/services/reportService';

vi.mock('@/services/reportService');

describe('ReportContentModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    targetType: 'REVIEW',
    targetId: 'rev-123',
    targetTitle: 'Ficciones Review',
    authorName: 'Patron Borges',
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal dialog with accessible title, subtitle, and reason selector', () => {
    render(<ReportContentModal {...defaultProps} />);

    expect(screen.getByRole('dialog', { name: /Report Content/i })).toBeInTheDocument();
    expect(screen.getByText(/Flag reader review by Patron Borges/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for Concern \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Additional Details \(Optional\)/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ReportContentModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('updates selected reason and displays its description', () => {
    render(<ReportContentModal {...defaultProps} />);

    const select = screen.getByLabelText(/Reason for Concern \*/i);
    fireEvent.change(select, { target: { value: 'SPOILER' } });

    expect(select).toHaveValue('SPOILER');
    expect(
      screen.getByText(/Major narrative, plot, or conclusion revelations/i)
    ).toBeInTheDocument();
  });

  it('updates explanation textarea and tracks character count', () => {
    render(<ReportContentModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Provide context or cite specific sentences/i);
    fireEvent.change(textarea, { target: { value: 'Contains severe ending spoiler on page 114.' } });

    expect(textarea).toHaveValue('Contains severe ending spoiler on page 114.');
    expect(screen.getByText('43 / 1000')).toBeInTheDocument();
  });

  it('submits report successfully and renders confirmation state', async () => {
    vi.mocked(reportService.createReport).mockResolvedValueOnce({
      id: 'rep-456',
      reporter_user_id: 'usr-reporter',
      target_type: 'REVIEW',
      target_id: 'rev-123',
      reason: 'SPOILER',
      details: 'Spolier text',
      status: 'PENDING',
      created_at: 1700000000,
    });

    render(<ReportContentModal {...defaultProps} />);

    const select = screen.getByLabelText(/Reason for Concern \*/i);
    fireEvent.change(select, { target: { value: 'SPOILER' } });

    const submitBtn = screen.getByTestId('submit-report-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reportService.createReport).toHaveBeenCalledWith({
        target_type: 'REVIEW',
        target_id: 'rev-123',
        reason: 'SPOILER',
        details: undefined,
      });
      expect(screen.getByTestId('report-success-view')).toBeInTheDocument();
      expect(screen.getByText('Report Inscribed')).toBeInTheDocument();
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('displays backend error message on failure (e.g. duplicate active report)', async () => {
    vi.mocked(reportService.createReport).mockRejectedValueOnce(
      new Error('You already have an active report for this content.')
    );

    render(<ReportContentModal {...defaultProps} />);

    const submitBtn = screen.getByTestId('submit-report-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('report-error-banner')).toBeInTheDocument();
      expect(
        screen.getByText('You already have an active report for this content.')
      ).toBeInTheDocument();
    });
  });

  it('calls onClose when close button or cancel button is clicked', () => {
    render(<ReportContentModal {...defaultProps} />);

    const closeBtn = screen.getByLabelText(/Close report dialog/i);
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
