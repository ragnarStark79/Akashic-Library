import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { ButtonVariant, ComponentSize } from '@/types/tokens';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ComponentSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled = false,
      className = '',
      type = 'button',
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
        aria-busy={isLoading}
        aria-disabled={isInteractiveDisabled}
        className={`
          ${styles.button}
          ${styles[variant]}
          ${styles[size]}
          ${fullWidth ? styles.fullWidth : ''}
          ${isLoading ? styles.loading : ''}
          ${className}
        `.trim()}
        {...props}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

