import { getCsrfToken } from './authService';
import type {
  ReportItem,
  ModerationAuditItem,
  CreateReportPayload,
  ResolveReportPayload,
  ModerationActionPayload,
} from '@/types/moderation';

const BASE_URL = '/api/community';

/**
 * Submit a content report from an authenticated patron.
 */
export async function createReport(payload: CreateReportPayload): Promise<ReportItem> {
  const csrfToken = getCsrfToken();
  const response = await fetch(`${BASE_URL}/reports/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg =
      data.error ||
      data.detail ||
      (typeof data === 'object' && Object.values(data)[0]) ||
      'Failed to submit report. Please try again.';
    throw new Error(String(errorMsg));
  }

  return data;
}

/**
 * Fetch reports for the moderation queue with optional filters.
 */
export async function fetchModerationReports(params?: {
  status?: string;
  target_type?: string;
  skip?: number;
  limit?: number;
}): Promise<ReportItem[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') {
    query.set('status', params.status);
  }
  if (params?.target_type && params.target_type !== 'ALL') {
    query.set('target_type', params.target_type);
  }
  if (typeof params?.skip === 'number') {
    query.set('skip', String(params.skip));
  }
  if (typeof params?.limit === 'number') {
    query.set('limit', String(params.limit));
  }

  const url = `${BASE_URL}/moderation/reports/${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Access denied. Curator privileges required.');
    }
    throw new Error(`Failed to load moderation reports (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
}

/**
 * Retrieve a single report detail by ID.
 */
export async function fetchModerationReportDetail(reportId: string): Promise<ReportItem> {
  const response = await fetch(`${BASE_URL}/moderation/reports/${reportId}/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Report record not found in the archives.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Access denied. Curator privileges required.');
    }
    throw new Error(`Failed to retrieve report detail (${response.status})`);
  }

  return response.json();
}

/**
 * Resolve or dismiss a moderation report.
 */
export async function resolveModerationReport(
  reportId: string,
  payload: ResolveReportPayload
): Promise<ReportItem> {
  const csrfToken = getCsrfToken();
  const response = await fetch(`${BASE_URL}/moderation/reports/${reportId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.detail || 'Failed to update report resolution.';
    throw new Error(String(errorMsg));
  }

  return data;
}

/**
 * Soft-hide reported content from public discovery feeds.
 */
export async function hideContent(
  targetType: string,
  targetId: string,
  payload?: ModerationActionPayload
): Promise<void> {
  const csrfToken = getCsrfToken();
  const response = await fetch(
    `${BASE_URL}/moderation/hide/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload || {}),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errorMsg = data.error || data.detail || 'Failed to hide content.';
    throw new Error(String(errorMsg));
  }
}

/**
 * Restore soft-hidden content to public view.
 */
export async function restoreContent(
  targetType: string,
  targetId: string,
  payload?: ModerationActionPayload
): Promise<void> {
  const csrfToken = getCsrfToken();
  const response = await fetch(
    `${BASE_URL}/moderation/restore/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload || {}),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errorMsg = data.error || data.detail || 'Failed to restore content.';
    throw new Error(String(errorMsg));
  }
}

/**
 * Fetch moderation audit history.
 */
export async function fetchModerationAudits(params?: {
  target_type?: string;
  target_id?: string;
  report_id?: string;
  action?: string;
  skip?: number;
  limit?: number;
}): Promise<ModerationAuditItem[]> {
  const query = new URLSearchParams();
  if (params?.target_type) query.set('target_type', params.target_type);
  if (params?.target_id) query.set('target_id', params.target_id);
  if (params?.report_id) query.set('report_id', params.report_id);
  if (params?.action) query.set('action', params.action);
  if (typeof params?.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params?.limit === 'number') query.set('limit', String(params.limit));

  const url = `${BASE_URL}/moderation/audits/${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to load moderation audits (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
}
