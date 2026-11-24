export interface WhyAkashicCapsule {
  id: string;
  text: string;
  subtext?: string;
  variant: 'first' | 'second' | 'third' | 'fourth' | 'fifth';
  backgroundColor: string;
  textColor: string;
  rotationDesktop: number;
  rotationTablet: number;
  rotationMobile: number;
}

export interface WhyAkashicSectionProps {
  className?: string;
  onExploreClick?: () => void;
}
