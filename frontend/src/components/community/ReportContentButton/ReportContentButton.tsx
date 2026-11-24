import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ReportContentModal } from '../ReportContentModal/ReportContentModal';
import type { TargetTypeCode } from '@/types/moderation';
import styles from './ReportContentButton.module.css';

export interface ReportContentButtonProps {
  targetType: TargetTypeCode | string;
  targetId: string;
  targetTitle?: string;
  authorId?: string;
  authorName?: string;
  className?: string;
  variant?: 'inline' | 'iconOnly' | 'subtle';
  onSignInRequest?: () => void;
  onReportSubmitted?: () => void;
}

export const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  targetType,
  targetId,
  targetTitle,
  authorId,
  authorName,
  className = '',
  variant = 'inline',
  onSignInRequest,
  onReportSubmitted,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Self-report prevention: hide button on patron's own content
  if (isAuthenticated && user && authorId && user.id === authorId) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      if (onSignInRequest) {
        onSignInRequest();
      } else {
        window.location.href = '/?view=auth&tab=signin';
      }
      return;
    }

    setIsModalOpen(true);
  };

  const btnClasses = [
    styles.reportBtn,
    variant === 'iconOnly' ? styles.iconOnly : '',
    variant === 'subtle' ? styles.subtle : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        type="button"
        className={btnClasses}
        onClick={handleClick}
        aria-label={`Report ${targetType.toLowerCase()}${authorName ? ` by ${authorName}` : ''}`}
        title={`Report ${targetType.toLowerCase()}`}
        data-testid={`report-btn-${targetId}`}
      >
        <Flag size={13} aria-hidden="true" />
        {variant !== 'iconOnly' && <span>Report</span>}
      </button>

      {isModalOpen && (
        <ReportContentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          targetType={targetType}
          targetId={targetId}
          targetTitle={targetTitle}
          authorName={authorName}
          onSuccess={onReportSubmitted}
        />
      )}
    </>
  );
};
