import { getCsrfToken } from './authService';
import type {
  Discussion,
  CreateDiscussionPayload,
  DiscussionReply,
  CreateReplyPayload,
  UpdateReplyPayload,
  DiscussionFilterParams,
} from '@/types/community';

const BASE_URL = '/api/community';

/**
 * List discussions with optional category, book anchor, search query, and pagination filters.
 */
export async function listDiscussions(params?: DiscussionFilterParams): Promise<Discussion[]> {
  const query = new URLSearchParams();
  if (params?.topic_type && params.topic_type !== 'ALL') {
    query.set('topic_type', params.topic_type);
  }
  if (params?.book_id) {
    query.set('book_id', params.book_id);
  }
  if (params?.q && params.q.trim()) {
    query.set('q', params.q.trim());
  }
  if (typeof params?.skip === 'number') {
    query.set('skip', String(params.skip));
  }
  if (typeof params?.limit === 'number') {
    query.set('limit', String(params.limit));
  }

  const url = `${BASE_URL}/discussions/${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to load community discussions (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.results || []);
}

/**
 * Retrieve a single discussion by ID.
 */
export async function getDiscussion(discussionId: string): Promise<Discussion> {
  const response = await fetch(`${BASE_URL}/discussions/${discussionId}/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Discussion not found or no longer available.');
    }
    throw new Error(`Failed to load discussion (${response.status})`);
  }

  return response.json();
}

/**
 * Create a new community discussion.
 */
export async function createDiscussion(payload: CreateDiscussionPayload): Promise<Discussion> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const body: Record<string, unknown> = {
    title: payload.title.trim(),
    body: payload.body.trim(),
  };

  if (payload.topic_type && payload.topic_type !== 'ALL') {
    body.topic_type = payload.topic_type;
  }
  if (payload.book_id && payload.book_id.trim()) {
    body.book_id = payload.book_id.trim();
  }

  const response = await fetch(`${BASE_URL}/discussions/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (response.status === 201) {
    return response.json();
  }

  if (response.status === 401) {
    throw new Error('You must be signed in to inscribe a dialogue.');
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.error || 'Invalid dialogue submission.';
    if (typeof errorData === 'object' && !errorData.error) {
      const details = Object.entries(errorData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join('; ');
      if (details) msg = details;
    }
    throw new Error(msg);
  }

  throw new Error(`Failed to create discussion (${response.status})`);
}

/**
 * List replies for a discussion.
 */
export async function listReplies(discussionId: string): Promise<DiscussionReply[]> {
  const response = await fetch(`${BASE_URL}/discussions/${discussionId}/replies/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.results || []);
}

/**
 * Inscribe a new reply (direct or nested with parent_id, with optional citations).
 */
export async function createReply(
  discussionId: string,
  payload: CreateReplyPayload
): Promise<DiscussionReply> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const body: Record<string, unknown> = {
    body: payload.body.trim(),
  };

  if (payload.parent_id) {
    body.parent_id = payload.parent_id;
  }
  if (payload.book_id) {
    body.book_id = payload.book_id;
  }
  if (payload.page_reference?.trim()) {
    body.page_reference = payload.page_reference.trim();
  }
  if (payload.chapter_reference?.trim()) {
    body.chapter_reference = payload.chapter_reference.trim();
  }
  if (payload.passage_excerpt?.trim()) {
    body.passage_excerpt = payload.passage_excerpt.trim();
  }

  const response = await fetch(`${BASE_URL}/discussions/${discussionId}/replies/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (response.status === 201) {
    return response.json();
  }

  if (response.status === 401) {
    throw new Error('You must be signed in to inscribe a response.');
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.error || 'Invalid reflection submission.';
    if (typeof errorData === 'object' && !errorData.error) {
      const details = Object.entries(errorData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join('; ');
      if (details) msg = details;
    }
    throw new Error(msg);
  }

  throw new Error(`Failed to record response (${response.status})`);
}

/**
 * Edit an existing reply.
 */
export async function updateReply(
  discussionId: string,
  replyId: string,
  payload: UpdateReplyPayload
): Promise<DiscussionReply> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const body: Record<string, unknown> = {};
  if (payload.body !== undefined) {
    body.body = payload.body.trim();
  }
  if (payload.page_reference !== undefined) {
    body.page_reference = payload.page_reference?.trim() || null;
  }
  if (payload.chapter_reference !== undefined) {
    body.chapter_reference = payload.chapter_reference?.trim() || null;
  }
  if (payload.passage_excerpt !== undefined) {
    body.passage_excerpt = payload.passage_excerpt?.trim() || null;
  }

  const response = await fetch(`${BASE_URL}/discussions/${discussionId}/replies/${replyId}/`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return response.json();
  }

  if (response.status === 401) {
    throw new Error('You must be signed in to edit this reflection.');
  }
  if (response.status === 403) {
    throw new Error('You can only edit your own reflections.');
  }
  if (response.status === 404) {
    throw new Error('Reflection not found.');
  }

  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || `Failed to update reflection (${response.status})`);
}

/**
 * Delete an existing reply.
 */
export async function deleteReply(discussionId: string, replyId: string): Promise<void> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/discussions/${discussionId}/replies/${replyId}/`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (response.status === 204 || response.ok) {
    return;
  }

  if (response.status === 401) {
    throw new Error('You must be signed in to remove this reflection.');
  }
  if (response.status === 403) {
    throw new Error('You can only remove your own reflections.');
  }
  if (response.status === 404) {
    throw new Error('Reflection not found.');
  }

  throw new Error(`Failed to remove reflection (${response.status})`);
}

