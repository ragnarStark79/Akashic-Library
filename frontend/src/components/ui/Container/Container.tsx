import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import type { ContainerMaxWidth } from '@/types/tokens';
import styles from './Container.module.css';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
  maxWidth?: ContainerMaxWidth;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      as: Component = 'div',
      maxWidth = 'xl',
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
          ${styles.container}
          ${styles[maxWidth]}
          ${styles[`pad-${padding}`]}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Container.displayName = 'Container';

