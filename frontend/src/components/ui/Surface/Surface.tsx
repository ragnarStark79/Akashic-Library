import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import type { RadiusScale, SurfaceVariant } from '@/types/tokens';
import styles from './Surface.module.css';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
  variant?: SurfaceVariant;
  radius?: RadiusScale;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      as: Component = 'div',
      variant = 'raised',
      radius = 'lg',
      padding = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={`
          ${styles.surface}
          ${styles[variant]}
          ${styles[`radius-${radius}`]}
          ${styles[`padding-${padding}`]}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Surface.displayName = 'Surface';

