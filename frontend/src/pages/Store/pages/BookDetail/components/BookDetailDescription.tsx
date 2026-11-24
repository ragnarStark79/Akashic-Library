import styles from './BookDetailDescription.module.css';

export interface BookDetailDescriptionProps {
  synopsis: string;
  fullDescription: string;
}

export function BookDetailDescription({
  synopsis,
  fullDescription,
}: BookDetailDescriptionProps) {
  if (!synopsis && !fullDescription) return null;

  const hasHtmlSynopsis = /<[a-z][\s\S]*>/i.test(synopsis);
  const hasHtmlFull = /<[a-z][\s\S]*>/i.test(fullDescription);

  return (
    <div className={styles.descriptionWrapper} data-testid="book-detail-description">
      {synopsis && (
        <div className={styles.synopsis}>
          {hasHtmlSynopsis ? (
            <div dangerouslySetInnerHTML={{ __html: synopsis }} />
          ) : (
            <p>{synopsis}</p>
          )}
        </div>
      )}

      {fullDescription && (
        <div className={styles.fullDescription}>
          {hasHtmlFull ? (
            <div dangerouslySetInnerHTML={{ __html: fullDescription }} />
          ) : (
            fullDescription
              .split('\n\n')
              .filter(Boolean)
              .map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
          )}
        </div>
      )}
    </div>
  );
}
