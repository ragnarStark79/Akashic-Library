import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { Button, IconButton } from '../../ui';
import { APPROVED_GENRES } from '../../../services/discoveryService';
import type { SearchFilters } from '../../../types/discovery';
import styles from './FilterDrawer.module.css';

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Partial<SearchFilters>;
  onApply: (newFilters: Partial<SearchFilters>) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const LANGUAGE_OPTIONS = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'fr', label: 'French' },
  { code: 'pl', label: 'Polish' },
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  triggerRef,
}) => {
  const [tempSubject, setTempSubject] = useState(filters.subject || '');
  const [tempLanguage, setTempLanguage] = useState(filters.language || '');
  const [tempYearFrom, setTempYearFrom] = useState<string>(
    filters.year_from ? String(filters.year_from) : ''
  );
  const [tempYearTo, setTempYearTo] = useState<string>(
    filters.year_to ? String(filters.year_to) : ''
  );

  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Sync internal state with props when opening
  useEffect(() => {
    if (isOpen) {
      setTempSubject(filters.subject || '');
      setTempLanguage(filters.language || '');
      setTempYearFrom(filters.year_from ? String(filters.year_from) : '');
      setTempYearTo(filters.year_to ? String(filters.year_to) : '');

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus close button on open
      setTimeout(() => closeBtnRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }

        // Focus trap
        if (e.key === 'Tab' && sheetRef.current) {
          const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      };

      const triggerNode = triggerRef?.current;
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
        triggerNode?.focus();
      };
    }
  }, [isOpen, filters, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleResetAll = () => {
    setTempSubject('');
    setTempLanguage('');
    setTempYearFrom('');
    setTempYearTo('');
  };

  const handleApply = () => {
    onApply({
      subject: tempSubject || undefined,
      language: tempLanguage || undefined,
      year_from: tempYearFrom ? parseInt(tempYearFrom, 10) : undefined,
      year_to: tempYearTo ? parseInt(tempYearTo, 10) : undefined,
      page: 1, // Reset to page 1 on filter application
    });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${styles.open}`}
        onClick={onClose}
        data-testid="filter-drawer-backdrop"
        aria-hidden="true"
      />

      {/* Bottom Sheet Dialog */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter Archives"
        className={`${styles.sheet} ${styles.open}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className={styles.grabHandleContainer} aria-hidden="true">
          <div className={styles.grabHandle} />
        </div>

        {/* Header */}
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>Filter Archives</h2>
          <IconButton
            ref={closeBtnRef}
            variant="ghost"
            size="lg"
            className={styles.closeButton}
            icon={<X size={20} />}
            aria-label="Close filter drawer"
            onClick={onClose}
          />
        </div>

        {/* Filter Groups */}
        <div className={styles.sheetContent}>
          {/* Group 1: Disciplines & Genres */}
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>Discipline / Category</legend>
            <div className={styles.pillGrid}>
              <button
                type="button"
                className={`${styles.filterPill} ${tempSubject === '' ? styles.active : ''}`}
                onClick={() => setTempSubject('')}
              >
                {tempSubject === '' && <Check size={14} />}
                <span>All Disciplines</span>
              </button>
              {APPROVED_GENRES.map((genre) => {
                const isActive = tempSubject.toLowerCase() === genre.name.toLowerCase();
                return (
                  <button
                    key={genre.id}
                    type="button"
                    className={`${styles.filterPill} ${isActive ? styles.active : ''}`}
                    onClick={() => setTempSubject(isActive ? '' : genre.name)}
                  >
                    {isActive && <Check size={14} />}
                    <span>{genre.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Group 2: Language Expression */}
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>Language Expression</legend>
            <div className={styles.pillGrid}>
              {LANGUAGE_OPTIONS.map((lang) => {
                const isActive = tempLanguage === lang.code;
                return (
                  <button
                    key={lang.code || 'all'}
                    type="button"
                    className={`${styles.filterPill} ${isActive ? styles.active : ''}`}
                    onClick={() => setTempLanguage(lang.code)}
                  >
                    {isActive && <Check size={14} />}
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Group 3: Publication Year Range */}
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>Publication Year Range</legend>
            <div className={styles.yearRangeRow}>
              <input
                type="number"
                placeholder="From (e.g. 1940)"
                aria-label="Publication year from"
                className={styles.yearInput}
                value={tempYearFrom}
                onChange={(e) => setTempYearFrom(e.target.value)}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>–</span>
              <input
                type="number"
                placeholder="To (e.g. 2024)"
                aria-label="Publication year to"
                className={styles.yearInput}
                value={tempYearTo}
                onChange={(e) => setTempYearTo(e.target.value)}
              />
            </div>
          </fieldset>
        </div>

        {/* Actions Footer */}
        <div className={styles.sheetFooter}>
          <Button
            variant="subtle"
            size="lg"
            className={styles.cancelBtn}
            onClick={handleResetAll}
          >
            Reset All
          </Button>

          <Button
            variant="primary"
            size="lg"
            className={styles.applyBtn}
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
};
