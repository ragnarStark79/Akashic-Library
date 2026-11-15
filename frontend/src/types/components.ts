import type { ReactNode } from 'react';
import type { ComponentSize, RadiusScale, SurfaceVariant } from './tokens';

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface InteractiveElementProps {
  disabled?: boolean;
  isLoading?: boolean;
  size?: ComponentSize;
}

export interface SurfaceProps extends BaseComponentProps {
  variant?: SurfaceVariant;
  radius?: RadiusScale;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav';
}

