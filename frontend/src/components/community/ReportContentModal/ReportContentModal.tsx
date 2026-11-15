import React, { useState, useEffect, useRef } from 'react';
import { Flag, X, ChevronDown, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { createReport } from '@/services/reportService';
import { REPORT_REASONS, type TargetTypeCode, type ReportReasonCode } from '@/types/moderation';
import styles from './ReportContentModal.module.css';

export interface ReportContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: TargetTypeCode | string;
  targetId: string;
  targetTitle?: string;
  authorName?: string;
  onSuccess?: () => void;
}

function getTargetTypeLabel(type: string): string {
  const norm = type.toUpperCase();
  switch (norm) {
    case 'DISCUSSION':
      return 'community dialogue';
    case 'REPLY':
    case 'DISCUSSION_REPLY':
      return 'discussion reply';
    case 'REVIEW':
      return 'reader review';
    case 'REVIEW_REPLY':
      return 'review reply';
    case 'ANNOTATION':
      return 'shared marginalia';
    default:
      return 'content';
  }
}

export const ReportContentModal: React.FC<ReportContentModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  authorName,
  onSuccess,
}) => {
  const [reason, setReason] = useState<ReportReasonCode>('SPAM');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset states when opening/closing
  useEffect(() => {
    if (isOpen) {
      setReason('SPAM');
      setDetails('');
      setErrorMessage(null);
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, targetId]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeLabel = getTargetTypeLabel(targetType);
  const selectedReasonObj = REPORT_REASONS.find((r) => r.value === reason);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || undefined,
      });

      setIsSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
      data-testid="report-content-modal"
    >
      <div
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        ref={dialogRef}
      >
        <div className={styles.modalHeader}>
          <div className={styles.headerTextGroup}>
            <h2 id="report-modal-title" className={styles.modalTitle}>
              <Flag size={18} style={{ color: 'var(--color-action-primary)' }} aria-hidden="true" />
              Report Content
            </h2>
            <p className={styles.modalSubtitle}>
              Flag {typeLabel}
              {authorName ? ` by ${authorName}` : ''}
              {targetTitle ? ` (“${targetTitle}”)` : ''} for archival review.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close report dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {isSuccess ? (
          <div className={styles.successView} data-testid="report-success-view">
            <CheckCircle size={44} style={{ color: '#2e7d32' }} aria-hidden="true" />
            <h3 className={styles.successTitle}>Report Inscribed</h3>
            <p className={styles.successText}>
              Your report has been submitted to the Akashic library curators for review. We uphold the
              integrity and dignity of our reading sanctuary.
            </p>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={onClose}
              style={{ marginTop: 'var(--space-2)' }}
            >
              Return to Folio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
              {errorMessage && (
                <div className={styles.errorBanner} role="alert" data-testid="report-error-banner">
                  <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="report-reason-select" className={styles.formLabel}>
                  Reason for Concern *
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    id="report-reason-select"
                    className={styles.selectInput}
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReasonCode)}
                    required
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
                </div>
                {selectedReasonObj && (
                  <span className={styles.reasonDescription}>
                    {selectedReasonObj.description}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <div className={styles.textareaHeader}>
                  <label htmlFor="report-details-textarea" className={styles.formLabel}>
                    Additional Details (Optional)
                  </label>
                  <span className={styles.charCounter}>{details.length} / 1000</span>
                </div>
                <textarea
                  id="report-details-textarea"
                  className={styles.textareaInput}
                  rows={3}
                  maxLength={1000}
                  placeholder="Provide context or cite specific sentences to assist curators..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>

              <div className={styles.custodialNotice}>
                <ShieldAlert size={16} style={{ color: 'var(--color-action-primary)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <span>
                  Reports are strictly confidential. Our curators review every submission against
                  the Akashic Covenant. Please avoid submitting duplicate reports for the same item.
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || !reason}
                data-testid="submit-report-btn"
              >
                <Flag size={14} aria-hidden="true" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
