export interface BookListItem {
  id: string;
  title: string;
  authors: string[];
  cover_url?: string | null;
  language?: string | null;
  published_date?: string | null;
  rating?: number | null;
  review_count: number;
  in_store?: boolean;
}

export interface BookDetailIdentifiers {
  isbn10: string | null;
  isbn13: string | null;
}

export interface BookDetailPublication {
  publisher: string | null;
  published_date: string | null;
  language: string | null;
  page_count: number | null;
}

export interface BookDetailCover {
  url: string;
  size?: string;
  is_primary?: boolean;
}

export interface BookDetailCommunity {
  average_rating: number | null;
  rating_count: number;
  distribution?: Record<string, number>;
}

export interface BookDetailStore {
  available: boolean;
  product_id?: string | null;
}

export type AccessClassification =
  | 'OUR_STORE'
  | 'EXTERNAL_PURCHASE'
  | 'PREVIEW'
  | 'BORROW'
  | 'PUBLIC_DOMAIN'
  | 'INFORMATION';

export interface AccessOption {
  type: AccessClassification;
  label: string;
  provider: string;
  url?: string | null;
  availability?: string | null;
  jurisdiction?: string | null;
  description?: string | null;
}

export interface RecommendationBook {
  id: string;
  title: string;
  authors: Array<{ name: string } | string> | string[];
  description?: string | null;
  covers?: Array<{ url: string; size?: string; is_primary?: boolean } | string> | string[];
  subjects?: string[];
  recommendation_reason?: string;
  cover_url?: string | null;
  rating?: number | null;
  review_count?: number;
}

export interface RecommendationResponse {
  count: number;
  page: number;
  page_size: number;
  results: RecommendationBook[];
}

export interface ExternalLinksResponse {
  google_books?: string | null;
  open_library?: string | null;
  goodreads?: string | null;
  access_options?: AccessOption[];
}

export interface BookDetail {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  identifiers: BookDetailIdentifiers;
  publication: BookDetailPublication;
  subjects: string[];
  covers: string[] | BookDetailCover[];
  community?: BookDetailCommunity;
  store?: BookDetailStore;
  access_options?: AccessOption[];
  rating?: number | null;
  review_count?: number;
  quote?: string | null;
}

export interface ReviewAuthor {
  id: string;
  username: string;
  display_name: string;
}

export interface BookReview {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string;
  contains_spoiler: boolean;
  helpful_count: number;
  moderation_status: string;
  created_at: string;
  updated_at: string;
  author: ReviewAuthor;
  reply_count?: number;
}

export interface ReviewReply {
  id: string;
  review_id: string;
  book_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: ReviewAuthor;
}

export interface BookReviewsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BookReview[];
}

export interface BookAggregateRating {
  average_rating: number | null;
  rating_count: number;
  distribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
    [key: string]: number;
  };
}

export interface CreateReviewPayload {
  rating: number;
  body: string;
  title?: string | null;
  contains_spoiler?: boolean;
}

export interface UpdateReviewPayload {
  rating?: number;
  title?: string | null;
  body?: string;
  contains_spoiler?: boolean;
}

export interface AddToLibraryResult {
  success: boolean;
  requiresAuth?: boolean;
  message?: string;
}

export type SearchScope = 'everything' | 'title' | 'author' | 'isbn' | 'subject';

export type AnnotationVisibility = 'PRIVATE' | 'SHARED';

export interface BookAnnotation {
  id: string;
  book_id: string;
  user_id: string;
  content: string;
  visibility: AnnotationVisibility;
  page_reference?: string | null;
  chapter_reference?: string | null;
  passage_excerpt?: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    display_name?: string;
  };
}

export interface CreateAnnotationPayload {
  content: string;
  visibility?: AnnotationVisibility;
  page_reference?: string | null;
  chapter_reference?: string | null;
  passage_excerpt?: string | null;
}

export interface UpdateAnnotationPayload {
  content?: string;
  visibility?: AnnotationVisibility;
  page_reference?: string | null;
  chapter_reference?: string | null;
  passage_excerpt?: string | null;
}

export interface AnnotationListResponse {
  count: number;
  page?: number;
  page_size?: number;
  counts?: {
    shared_count: number;
    my_private_count: number;
    my_shared_count: number;
    my_total_count: number;
  };
  results: BookAnnotation[];
}

export interface BookSearchResponse {
  count: number;
  upstream_count?: number | null;
  next: string | null;
  previous: string | null;
  results: BookListItem[];
}

export interface SearchFilters {
  q: string;
  title?: string;
  author?: string;
  isbn?: string;
  subject?: string;
  language?: string;
  year_from?: number;
  year_to?: number;
  sort?: 'relevance' | 'title' | 'date';
  page: number;
  page_size: number;
  search_scope?: SearchScope;
  featured?: boolean;
}

export interface GenreInfo {
  id: string;
  name: string;
  description: string;
  iconName?: string;
  subgenres?: string[];
  sampleThemes?: string[];
}
