import React from 'react';
import { BookOpen } from 'lucide-react';
import { Container } from '../../ui/Container';
import type { FooterProps, FooterSection } from '../../../types/navigation';
import styles from './Footer.module.css';

const DEFAULT_SECTIONS: FooterSection[] = [
  {
    title: 'Discovery',
    links: [
      { label: 'Search Catalog', href: '#discover' },
      { label: 'Curated Recommendations', href: '#recommendations' },
      { label: 'Browse Genres', href: '#genres' },
      { label: 'Featured Editions', href: '#featured' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Reader Discussions', href: '#community' },
      { label: 'Public Reviews', href: '#reviews' },
      { label: 'Reading Groups', href: '#groups' },
      { label: 'Reader Guidelines', href: '#guidelines' },
    ],
  },
  {
    title: 'Akashic',
    links: [
      { label: 'About the Library', href: '#about' },
      { label: 'API Architecture', href: '#api' },
      { label: 'Documentation', href: '#docs' },
      { label: 'Privacy & Terms', href: '#privacy' },
    ],
  },
];

export const Footer: React.FC<FooterProps> = ({
  className,
  sections = DEFAULT_SECTIONS,
  onNavigate,
}) => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  return (
    <footer className={`${styles.footer} ${className ?? ''}`} role="contentinfo">
      <Container maxWidth="xl">
        <div className={styles.footerGrid}>
          {/* Brand Column */}
          <div className={styles.brandCol}>
            <div className={styles.brandLogo}>
              <span className={styles.brandIcon} aria-hidden="true">
                <BookOpen size={16} />
              </span>
              <span className={styles.brandTitle}>Akashic Library</span>
            </div>
            <p className={styles.tagline}>
              A digital sanctuary for thoughtful discovery, literary curation, and quiet contemplation.
            </p>
          </div>

          {/* Navigation Link Columns */}
          {sections.map((section) => (
            <div key={section.title} className={styles.linkCol}>
              <h2 className={styles.colHeading}>{section.title}</h2>
              <ul className={styles.linkList}>
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={styles.footerLink}
                      onClick={(e) => handleLinkClick(link.href, e)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomRow}>
          <p className={styles.copyright}>
            &copy; {currentYear} Akashic Library. An open repository for curious minds.
          </p>
          <p className={styles.note}>
            Crafted with editorial restraint &bull; Powered by Django REST API
          </p>
        </div>
      </Container>
    </footer>
  );
};
