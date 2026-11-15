import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { ComponentSize, IconButtonVariant } from '@/types/tokens';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: ComponentSize;
  isLoading?: boolean;
  icon: ReactNode;
  /** Mandatory accessible label for screen readers */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'subtle',
      size = 'md',
      isLoading = false,
      icon,
      disabled = false,
      className = '',
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const isInteractiveDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractiveDisabled}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={isInteractiveDisabled}
        className={`
          ${styles.iconButton}
          ${styles[variant]}
          ${styles[size]}
          ${isLoading ? styles.loading : ''}
          ${className}
        `.trim()}
        {...props}
      >
        {isLoading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

