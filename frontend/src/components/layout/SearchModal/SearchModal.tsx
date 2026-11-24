import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Search, X, BookOpen } from 'lucide-react';
import type { SearchScope } from '@/types/discovery';
import styles from './SearchModal.module.css';

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchSubmit: (query: string, scope?: SearchScope) => void;
  initialQuery?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function SearchModal({
  isOpen,
  onClose,
  onSearchSubmit,
  initialQuery = '',
  triggerRef,
}: SearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>('everything');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      // Automatically focus the editable input after modal animation/render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery]);

  // Lock body scroll and trap focus while open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const triggerEl = triggerRef?.current;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      triggerEl?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearchSubmit(trimmed, scope);
    onClose();
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const scopes: { id: SearchScope; label: string }[] = [
    { id: 'everything', label: 'Everything' },
    { id: 'title', label: 'Title' },
    { id: 'author', label: 'Author' },
    { id: 'subject', label: 'Subject' },
  ];

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      data-testid="search-modal-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.archiveBadge}>
              <BookOpen size={13} aria-hidden="true" />
              Custodial Search
            </span>
            <h2 id="search-modal-title" className={styles.modalTitle}>
              Search the Custodial Archives
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close search dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Search Form */}
        <form className={styles.form} onSubmit={handleSubmit} role="search">
          <div className={styles.inputWrapper}>
            <Search size={20} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              role="searchbox"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search titles, authors, ISBNs, subjects..."
              aria-label="Search catalog folios"
              className={styles.input}
              autoComplete="off"
              spellCheck="false"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className={styles.clearButton}
                aria-label="Clear search input"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Scope Selector */}
          <div className={styles.scopeBar} role="radiogroup" aria-label="Search scope">
            <span className={styles.scopeLabel}>Scope:</span>
            {scopes.map((s) => {
              const isSelected = scope === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${styles.scopePill} ${isSelected ? styles.scopePillActive : ''}`}
                  onClick={() => setScope(s.id)}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Footer with shortcuts and submit */}
          <div className={styles.modalFooter}>
            <div className={styles.hints}>
              <span>
                <kbd className={styles.kbd}>Esc</kbd> to close
              </span>
              <span>•</span>
              <span>
                <kbd className={styles.kbd}>↵ Enter</kbd> to search
              </span>
            </div>
            <button
              type="submit"
              disabled={!query.trim()}
              className={styles.submitButton}
            >
              Search Catalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
