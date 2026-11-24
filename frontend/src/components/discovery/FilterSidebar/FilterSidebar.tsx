import React, { useState, useEffect } from 'react';
import { Button } from '../../ui';
import { APPROVED_GENRES } from '../../../services/discoveryService';
import type { SearchFilters } from '../../../types/discovery';
import styles from './FilterSidebar.module.css';

export interface FilterSidebarProps {
  filters: Partial<SearchFilters>;
  onApply: (newFilters: Partial<SearchFilters>) => void;
  className?: string;
}

const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'fr', label: 'French' },
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onApply,
  className = '',
}) => {
  const [selectedSubject, setSelectedSubject] = useState(filters.subject || '');
  const [selectedLanguage, setSelectedLanguage] = useState(filters.language || '');
  const [yearFrom, setYearFrom] = useState(filters.year_from ? String(filters.year_from) : '');
  const [yearTo, setYearTo] = useState(filters.year_to ? String(filters.year_to) : '');

  useEffect(() => {
    setSelectedSubject(filters.subject || '');
    setSelectedLanguage(filters.language || '');
    setYearFrom(filters.year_from ? String(filters.year_from) : '');
    setYearTo(filters.year_to ? String(filters.year_to) : '');
  }, [filters]);

  const handleApply = () => {
    onApply({
      subject: selectedSubject || undefined,
      language: selectedLanguage || undefined,
      year_from: yearFrom ? parseInt(yearFrom, 10) : undefined,
      year_to: yearTo ? parseInt(yearTo, 10) : undefined,
      page: 1,
    });
  };

  const handleReset = () => {
    setSelectedSubject('');
    setSelectedLanguage('');
    setYearFrom('');
    setYearTo('');
    onApply({
      subject: undefined,
      language: undefined,
      year_from: undefined,
      year_to: undefined,
      page: 1,
    });
  };

  return (
    <aside className={`${styles.sidebar} ${className}`} aria-label="Catalog Filters">
      <div className={styles.sidebarHeader}>
        <h2 className={styles.title}>Refine Codex</h2>
        <button type="button" className={styles.resetBtn} onClick={handleReset}>
          Reset All
        </button>
      </div>

      {/* Discipline / Category Filter */}
      <div className={styles.filterGroup}>
        <span className={styles.groupTitle}>Disciplines</span>
        <ul className={styles.optionList}>
          <li>
            <label className={styles.optionLabel}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="subject"
                  checked={selectedSubject === ''}
                  onChange={() => setSelectedSubject('')}
                />
                <span>All Disciplines</span>
              </div>
            </label>
          </li>
          {APPROVED_GENRES.map((g) => (
            <li key={g.id}>
              <label className={styles.optionLabel}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="subject"
                    checked={selectedSubject.toLowerCase() === g.name.toLowerCase()}
                    onChange={() => setSelectedSubject(g.name)}
                  />
                  <span>{g.name}</span>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Language Filter */}
      <div className={styles.filterGroup}>
        <span className={styles.groupTitle}>Language</span>
        <ul className={styles.optionList}>
          {LANGUAGES.map((l) => (
            <li key={l.code || 'all'}>
              <label className={styles.optionLabel}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="language"
                    checked={selectedLanguage === l.code}
                    onChange={() => setSelectedLanguage(l.code)}
                  />
                  <span>{l.label}</span>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Era / Publication Year Filter */}
      <div className={styles.filterGroup}>
        <span className={styles.groupTitle}>Publication Era</span>
        <div className={styles.yearInputRow}>
          <input
            type="number"
            placeholder="From"
            aria-label="Filter year from"
            className={styles.yearInput}
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
          />
          <span>–</span>
          <input
            type="number"
            placeholder="To"
            aria-label="Filter year to"
            className={styles.yearInput}
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.applyRow}>
        <Button variant="primary" size="md" fullWidth onClick={handleApply}>
          Apply Filters
        </Button>
      </div>
    </aside>
  );
};

