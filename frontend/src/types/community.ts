export type TopicType =
  | 'ALL'
  | 'BOOK_INQUIRY'
  | 'PHILOSOPHICAL_THESIS'
  | 'LITERARY_TRANSLATION'
  | 'SPECULATIVE_POETICS'
  | 'GENERAL';

export interface TopicCategoryOption {
  id: TopicType;
  label: string;
  description?: string;
}

export const TOPIC_CATEGORIES: TopicCategoryOption[] = [
  { id: 'ALL', label: 'All Dialogues' },
  { id: 'BOOK_INQUIRY', label: 'Book Inquiries', description: 'Interpretive questions and textual queries on specific folios.' },
  { id: 'PHILOSOPHICAL_THESIS', label: 'Philosophical Theses', description: 'Epistemological, metaphysical, and labyrinthine explorations.' },
  { id: 'LITERARY_TRANSLATION', label: 'Literary Form & Translation', description: 'Prosody, linguistic cadence, and comparative editions.' },
  { id: 'SPECULATIVE_POETICS', label: 'Speculative Poetics', description: 'Conjectural narratives, thought experiments, and symbolic structures.' },
];

export interface DiscussionAuthor {
  id: string;
  username: string;
  display_name: string;
}

export interface DiscussionBook {
  id: string;
  title: string;
  authors: string[];
  cover_url?: string | null;
}

export interface Discussion {
  id: string;
  title: string;
  body: string;
  topic_type: TopicType;
  author_user_id: string;
  created_at: number;
  updated_at: number;
  moderation_status: string;
  book_id?: string | null;
  author?: DiscussionAuthor;
  reply_count?: number;
  book?: DiscussionBook | null;
}

export interface CreateDiscussionPayload {
  title: string;
  body: string;
  topic_type?: TopicType;
  book_id?: string | null;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  parent_id?: string | null;
  author_user_id: string;
  body: string;
  book_id?: string | null;
  page_reference?: string | null;
  chapter_reference?: string | null;
  passage_excerpt?: string | null;
  created_at: number;
  updated_at: number;
  moderation_status: string;
  author?: DiscussionAuthor;
}

export interface CreateReplyPayload {
  body: string;
  parent_id?: string | null;
  book_id?: string | null;
  page_reference?: string | null;
  chapter_reference?: string | null;
  passage_excerpt?: string | null;
}

export interface UpdateReplyPayload {
  body?: string;
  page_reference?: string | null;
  chapter_reference?: string | null;
  passage_excerpt?: string | null;
}

export interface DiscussionFilterParams {
  topic_type?: string;
  book_id?: string;
  q?: string;
  skip?: number;
  limit?: number;
}

