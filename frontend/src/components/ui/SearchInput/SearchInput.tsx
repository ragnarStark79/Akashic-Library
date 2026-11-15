import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { Search, X } from 'lucide-react';
import styles from './SearchInput.module.css';

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  isLoading?: boolean;
  onClear?: () => void;
  'aria-label'?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      isLoading = false,
      disabled = false,
      placeholder = 'Search by title, author, or keyword...',
      className = '',
      id: customId,
      'aria-label': customAriaLabel,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const defaultId = useId();
    const inputId = customId ?? defaultId;
    const hasValue = Boolean(value && String(value).length > 0);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && hasValue && onClear) {
        e.preventDefault();
        onClear();
      }
      onKeyDown?.(e);
    };

    return (
      <div
        className={`
          ${styles.wrapper}
          ${disabled ? styles.disabled : ''}
          ${className}
        `.trim()}
      >
        <span className={styles.searchIcon} aria-hidden="true">
          <Search size={20} />
        </span>
        <input
          ref={ref}
          id={inputId}
          type="search"
          role="searchbox"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={customAriaLabel ?? 'Search books by title, author, or keyword'}
          aria-busy={isLoading}
          onKeyDown={handleKeyDown}
          className={styles.input}
          {...props}
        />
        <div className={styles.actionSlot}>
          {isLoading && (
            <span
              className={styles.spinner}
              role="status"
              aria-label="Searching..."
            />
          )}
          {hasValue && onClear && !isLoading && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search query"
              className={styles.clearButton}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

