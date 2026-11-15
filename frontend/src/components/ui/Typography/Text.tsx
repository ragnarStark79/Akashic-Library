import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import styles from './Typography.module.css';

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: 'body-lg' | 'body' | 'small' | 'caption';
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'highlight' | 'error' | 'inverse';
  as?: ElementType;
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  (
    {
      variant = 'body',
      color = 'primary',
      as: Component = 'p',
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
          ${styles.text}
          ${styles[variant]}
          ${styles[`color-${color}`]}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';

