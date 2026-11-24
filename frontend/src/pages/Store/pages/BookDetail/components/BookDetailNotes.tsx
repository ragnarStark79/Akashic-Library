import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './BookDetailNotes.module.css';

export interface BookDetailNotesProps {
  whyWeChose: string;
  contentWarnings?: string[] | string;
}

export function BookDetailNotes({
  whyWeChose,
  contentWarnings,
}: BookDetailNotesProps) {
  const [openWhy, setOpenWhy] = useState(false);
  const [openWarnings, setOpenWarnings] = useState(false);

  const warningsList: string[] = Array.isArray(contentWarnings)
    ? contentWarnings
    : typeof contentWarnings === 'string' && contentWarnings.trim()
      ? contentWarnings.split('\n').map((w) => w.trim()).filter(Boolean)
      : [];


  if (!whyWeChose && warningsList.length === 0) {
    return null;
  }

  return (
    <section className={styles.notesSection} data-testid="book-detail-notes">
      <header className={styles.notesHeader}>
        <div className={styles.rabbitEmblem} aria-hidden="true">
          <svg className={styles.emblemSvg} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="m53.332 55.909-9.81-22.05c1.253-3.071 4.434-12.573 1.132-24.425a.845.845 0 0 0-.602-.6.82.82 0 0 0-.82.24c-.096.12-2.651 2.711-4.507 6.19-2.58 4.799-2.531 8.854.12 11.78 2.917 3.192 3.062 5.423 2.893 6.431l-.555.048c-.988-2.111-4.29-8.062-12.51-13.82a.734.734 0 0 0-.698-.072c-.242.096-.386.336-.41.576-.314 3.839.723 11.3 6.893 12.212 3.881.576 5.183 1.68 5.593 2.136-.121.816-.41 1.871-.989 3.239l-7.28 16.651h-.023a1.456 1.456 0 0 1-.12.288l-.097.192c-1.157 2.471-5.327 6.766-6.99 8.446-.41.431-.7.72-.796.84-.096.12-.385.575.169 1.175.771.84 3.182 1.895 4.315 1.104.337-.24.53-.48.747-.768.627-.816 4.001-4.559 9.424-9.261 0 0 1.76-2.184 4.435-2.52h1.616c1.205 0 2.169.288 2.723 1.512l.892 2.04c.844 1.943.844 2.998-2 3.454v1.296h11.642v-1.248c-2.363-.432-2.869-1.727-4.387-5.086Zm-13.233-7.27a2.284 2.284 0 0 1-2.29-2.28 2.284 2.284 0 0 1 2.29-2.279 2.284 2.284 0 0 1 2.29 2.28c0 1.247-1.037 2.279-2.29 2.279Z"
              fill="currentColor"
            />
            <path
              clipRule="evenodd"
              d="M40.922 0C63.522 0 80 18.401 80 41.1 80 63.8 63.522 80 40.922 80S0 63.8 0 41.1C0 18.402 18.321 0 40.922 0Zm22.857 15.697c-13.817-13.474-36.234-13.754-49.77 0C.473 29.45 2.035 50.379 15.852 63.853 29.67 77.327 52.823 79.81 66.36 66.055c13.537-13.754 11.237-36.884-2.58-50.358Z"
              fill="currentColor"
              fillRule="evenodd"
            />
          </svg>
        </div>
        <h2 className={styles.heading}>Book notes</h2>
      </header>

      <div className={styles.accordionList}>
        {/* Accordion 1: Why we chose */}
        {whyWeChose && (
          <details
            className={`${styles.accordionItem} ${openWhy ? styles.active : ''}`}
            open={openWhy}
            onToggle={(e) => setOpenWhy((e.target as HTMLDetailsElement).open)}
          >
            <summary className={styles.accordionSummary}>
              <span className={styles.summaryLeft}>
                <span>🙋‍♀️</span>
                <span>Why we chose</span>
              </span>
              <span className={styles.chevron}>
                <ChevronDown size={22} />
              </span>
            </summary>
            <div className={styles.accordionContent}>
              <p>{whyWeChose}</p>
            </div>
          </details>
        )}

        {/* Accordion 2: Content warnings */}
        {warningsList.length > 0 && (
          <details
            className={`${styles.accordionItem} ${openWarnings ? styles.active : ''}`}
            open={openWarnings}
            onToggle={(e) => setOpenWarnings((e.target as HTMLDetailsElement).open)}
          >
            <summary className={styles.accordionSummary}>
              <span className={styles.summaryLeft}>
                <span>⚠️</span>
                <span>Content warnings</span>
              </span>
              <span className={styles.chevron}>
                <ChevronDown size={22} />
              </span>
            </summary>
            <div className={styles.accordionContent}>
              <ul className={styles.warningList}>
                {warningsList.map((warning, idx) => (
                  <li key={`${warning}-${idx}`} className={styles.warningPill}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
