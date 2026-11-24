import type { CommonQuestionsAccordionProps } from './types';
import styles from './CommonQuestionsAccordion.module.css';

export function CommonQuestionsAccordion({
  items,
  openIds,
  onToggle,
}: CommonQuestionsAccordionProps) {
  return (
    <div className={styles.accordion} data-accordion="">
      <ul className={styles.accordionList} role="list">
        {items.map((item) => {
          const isOpen = openIds.has(item.id);

          return (
            <li key={item.id} className={styles.accordionItem}>
              <div
                className={`${styles.accordionCard} ${isOpen ? styles.isActive : ''}`}
                data-testid={`common-question-item-${item.id}`}
              >
                <button
                  type="button"
                  className={styles.accordionSummaryBtn}
                  onClick={() => onToggle(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  id={`faq-header-${item.id}`}
                  data-testid={`common-question-btn-${item.id}`}
                >
                  <h3 className={styles.accordionTitle}>{item.question}</h3>
                  <span className={styles.accordionIconWrap} aria-hidden="true">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.accordionIconPlus}
                    >
                      <path
                        fill="currentColor"
                        d="M7.84 18.8v-7H1.12V7.88h6.72V.96h4.32v6.92h6.76v3.92h-6.76v7z"
                      />
                    </svg>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.accordionIconMinus}
                    >
                      <path fill="currentColor" d="M3.8 7.9h12.4v4.04H3.8z" />
                    </svg>
                  </span>
                </button>

                <div
                  id={`faq-answer-${item.id}`}
                  role="region"
                  aria-labelledby={`faq-header-${item.id}`}
                  className={`${styles.accordionContent} ${isOpen ? styles.isOpen : ''}`}
                  aria-hidden={!isOpen}
                >
                  <div className={styles.accordionContentInner}>
                    <p>{item.answer}</p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
