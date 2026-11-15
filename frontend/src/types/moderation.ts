export type TargetTypeCode =
  | 'DISCUSSION'
  | 'REPLY'
  | 'REVIEW'
  | 'REVIEW_REPLY'
  | 'ANNOTATION';

export type ReportStatusCode = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export type ReportReasonCode =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'INAPPROPRIATE'
  | 'SPOILER'
  | 'OFF_TOPIC'
  | 'OTHER';

export interface ReportItem {
  id: string;
  reporter_user_id: string;
  target_type: TargetTypeCode;
  target_id: string;
  reason: string;
  details?: string;
  status: ReportStatusCode;
  created_at: number;
  resolved_at?: number | null;
  resolved_by_user_id?: string | null;
  resolution_note?: string | null;

  // Enriched context fields
  target_content?: string;
  target_title?: string;
  target_author?: {
    id: string;
    username: string;
    display_name: string;
  };
  target_status?: 'VISIBLE' | 'HIDDEN' | 'PRIVATE' | 'DELETED';
  context?: {
    book_id?: string;
    book_title?: string;
    discussion_id?: string;
    review_id?: string;
    parent_reply_id?: string;
  };
}

export interface ModerationAuditItem {
  id: string;
  moderator_user_id: string;
  moderator_display_name: string;
  target_type: TargetTypeCode;
  target_id: string;
  report_id?: string | null;
  action: 'HIDE' | 'RESTORE' | 'RESOLVE_REPORT' | 'DISMISS_REPORT';
  note?: string;
  created_at: number;
}

export interface CreateReportPayload {
  target_type: TargetTypeCode | string;
  target_id: string;
  reason: string;
  details?: string;
}

export interface ResolveReportPayload {
  action: 'RESOLVED' | 'DISMISSED';
  note?: string;
}

export interface ModerationActionPayload {
  note?: string;
  report_id?: string;
}

export const REPORT_REASONS: { value: ReportReasonCode; label: string; description: string }[] = [
  {
    value: 'SPAM',
    label: 'Spam or Commercial Promotion',
    description: 'Unsolicited advertising, repetitive postings, or automated solicitation.',
  },
  {
    value: 'HARASSMENT',
    label: 'Harassment or Hostility',
    description: 'Targeted personal attacks, disparagement, or hostile reader confrontation.',
  },
  {
    value: 'HATE_SPEECH',
    label: 'Hate Speech or Discrimination',
    description: 'Dehumanizing language, slurs, or hatred targeted at identity or origin.',
  },
  {
    value: 'INAPPROPRIATE',
    label: 'Inappropriate or Offensive Material',
    description: 'Graphic, sexually explicit, or gratuitously profane content outside literary quotation.',
  },
  {
    value: 'SPOILER',
    label: 'Unmarked Spoilers',
    description: 'Major narrative, plot, or conclusion revelations without explicit spoiler marking.',
  },
  {
    value: 'OFF_TOPIC',
    label: 'Off-Topic or Disruptive',
    description: 'Completely disconnected from the book folio, literary thesis, or scholarly inquiry.',
  },
  {
    value: 'OTHER',
    label: 'Other Concern',
    description: 'Another ethical, custodial, or community norm violation requiring curator review.',
  },
];
