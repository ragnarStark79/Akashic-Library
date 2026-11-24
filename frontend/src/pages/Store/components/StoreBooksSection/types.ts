export interface TopBookGenre {
  name: string;
  backgroundColor: string;
  color: string;
}

export interface TopBookItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  backgroundColor: string;
  textColor: string; // '#FFFFFF' or '#1C2826'
  genres: TopBookGenre[];
  initialRotation: number; // in degrees
  initialYOffset: number;  // in percent
}

export interface StoreTopBooksSectionProps {
  className?: string;
  onSelectBook?: (book: TopBookItem) => void;
  onExploreCollection?: () => void;
}
