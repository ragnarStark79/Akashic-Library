import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      id: customId,
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const isError = Boolean(errorMessage);
    const describedBy = [
      helperText ? helperId : null,
      isError ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={`${styles.container} ${className}`.trim()}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div
          className={`
            ${styles.inputWrapper}
            ${isError ? styles.errorWrapper : ''}
            ${disabled ? styles.disabledWrapper : ''}
          `.trim()}
        >
          {leftIcon && (
            <span className={`${styles.iconSlot} ${styles.leftIcon}`}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={isError ? 'true' : undefined}
            aria-describedby={describedBy}
            className={styles.input}
            {...props}
          />
          {rightIcon && (
            <span className={`${styles.iconSlot} ${styles.rightIcon}`}>
              {rightIcon}
            </span>
          )}
        </div>
        {isError && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {errorMessage}
          </span>
        )}
        {!isError && helperText && (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';

