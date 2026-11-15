import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import styles from './Typography.module.css';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 'display' | 1 | 2 | 3 | 4;
  as?: ElementType;
  editorial?: boolean;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    {
      level = 1,
      as,
      editorial = true,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const Component = as ?? (level === 'display' ? 'h1' : `h${level}`);
    const levelClass = level === 'display' ? styles.display : styles[`h${level}`];
    const fontClass = editorial ? styles.editorial : styles.sans;

    return (
      <Component
        ref={ref}
        className={`${styles.heading} ${levelClass} ${fontClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = 'Heading';

