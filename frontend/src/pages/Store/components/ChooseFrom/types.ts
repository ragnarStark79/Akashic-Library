export interface CategoryItem {
  id: string;
  label: string;
  slug: string;
  hasWordBreak?: boolean;
}

export interface CategoryJitter {
  x: number;
  y: number;
  r: number;
}

export interface ChooseFromSectionProps {
  className?: string;
  onSelectCategory?: (category: CategoryItem) => void;
  onSignUpClick?: () => void;
}
