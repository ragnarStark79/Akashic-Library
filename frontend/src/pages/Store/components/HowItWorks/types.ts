export type HowItWorksVariant = 'base' | 'bright-pink' | 'yellow' | 'periwinkle';

export interface HowItWorksStepItem {
  id: string;
  step: string;
  title: string;
  description: string;
  illustration: string;
  alt: string;
  backgroundColor: string;
  textColor: string;
  variant: HowItWorksVariant;
}

export interface HowItWorksSectionProps {
  className?: string;
  onBecomeMemberClick?: () => void;
}
