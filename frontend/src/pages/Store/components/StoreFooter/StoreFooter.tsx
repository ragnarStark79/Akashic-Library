import { useState } from 'react';
import { Sparkles, Compass, ArrowUp } from 'lucide-react';
import type { StoreFooterProps } from '../../types/store';
import bookMockCover from '../../assets/images/book-cover-2.webp';
import { STORE_NAV_LINKS, SANCTUARY_NAV_LINKS, LEGAL_LINKS } from './data/footerLinks';
import styles from './StoreFooter.module.css';

export function StoreFooter({
  onNavigate,
  onExitPortalToLibrary,
  className = '',
}: StoreFooterProps) {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    // Client-side email pattern validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg('');
    setIsSubmitted(true);
  };

  const handleScrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`${styles.footer} ${className}`.trim()}
      role="contentinfo"
      data-testid="store-footer"
    >
      {/* Scalloped / Curved Top Wave Border */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 64"
        fill="currentColor"
        preserveAspectRatio="none"
        className={styles.footerCurve}
        aria-hidden="true"
      >
        <path d="M0,64 C360,16 720,0 1080,0 C1260,0 1380,16 1440,64 L1440,64 L0,64 Z" />
      </svg>

      <div className={styles.footerContainer}>
        {/* ── 3-Column Desktop Layout ── */}
        <div className={styles.footerTop}>
          {/* Left Column: Brand & Nav Links */}
          <div className={styles.leftCol}>
            <div className={styles.brandHeader}>
              <div className={styles.brandLogo}>
                <div className={styles.brandLogoIcon}>
                  <Sparkles size={28} />
                </div>
                <span className={styles.brandTitle}>Akashic Store</span>
              </div>

              {/* Bold "Open to everyone" Badge */}
              <div className={styles.openBadge} data-testid="store-open-badge">
                <span className={styles.openBadgeDot} />
                <span>Open to everyone.</span>
              </div>

              <p className={styles.brandBio}>
                An artisanal marketplace for physical book editions, archival boxed folios,
                and tactile literary goods for the contemplative reader.
              </p>

              {/* Prominent Return to Sanctuary Button */}
              <button
                type="button"
                className={styles.sanctuaryReturnBtn}
                onClick={onExitPortalToLibrary}
                aria-label="Return to Library Sanctuary"
                data-testid="return-sanctuary-btn"
              >
                <Compass size={18} />
                <span>Return to Library Sanctuary</span>
              </button>
            </div>

            {/* Store and Sanctuary Navigation Columns */}
            <div className={styles.navGroups}>
              {/* Store Links */}
              <div className={styles.navGroup}>
                <span className={styles.navGroupTitle}>Store</span>
                {STORE_NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    className={styles.navLink}
                    onClick={() => link.view && onNavigate(link.view)}
                    data-testid={`footer-link-${link.id}`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              {/* Sanctuary Links */}
              <div className={styles.navGroup}>
                <span className={styles.navGroupTitle}>Sanctuary</span>
                {SANCTUARY_NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    className={styles.navLink}
                    onClick={onExitPortalToLibrary}
                    data-testid={`footer-link-${link.id}`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: Large Floating Physical Book Visual */}
          <div
            className={styles.centerCol}
            aria-hidden="true"
            data-testid="footer-book-visual"
          >
            <div className={styles.bookMockWrap}>
              <img
                src={bookMockCover}
                alt="Akashic Archival Book Edition"
                className={styles.bookCoverImg}
                loading="lazy"
              />
              <div className={styles.bookSpineHighlight} />
            </div>
          </div>

          {/* Right Column: Join Our Mailing List */}
          <div className={styles.rightCol}>
            <h3 className={styles.newsletterTitle}>Join our mailing list</h3>
            <p className={styles.newsletterDesc}>
              Receive monthly folio announcements, author interviews, and limited boxed edition releases.
            </p>

            {isSubmitted ? (
              <div
                className={styles.successMessage}
                role="status"
                data-testid="newsletter-success-msg"
              >
                ✨ Welcome to our circle! You’ve joined the Akashic mailing list.
              </div>
            ) : (
              <form
                className={styles.newsletterForm}
                onSubmit={handleNewsletterSubmit}
                noValidate
              >
                <div className={styles.inputGroup}>
                  <label
                    htmlFor="store-newsletter-email"
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
                  >
                    Email Address
                  </label>
                  <input
                    id="store-newsletter-email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className={styles.newsletterInput}
                    aria-describedby={errorMsg ? 'newsletter-error' : undefined}
                    data-testid="newsletter-email-input"
                  />

                  {/* Dual-Capsule Subscribe Button */}
                  <button
                    type="submit"
                    className={styles.buttonAlt}
                    aria-label="Subscribe to newsletter"
                    data-testid="newsletter-submit-btn"
                  >
                    <span className={styles.buttonAltTextWrap}>
                      <span className={styles.buttonAltBg} />
                      <span className={styles.buttonAltTextOuter}>
                        <span className={styles.buttonAltText}>Subscribe</span>
                      </span>
                    </span>
                    <span className={styles.buttonAltIconWrap}>
                      <span className={styles.buttonAltBg} />
                      <span className={styles.buttonAltIconOuter}>
                        <svg
                          className={styles.buttonAltIcon}
                          viewBox="0 0 14 13"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M13.58 5.66v.845l-5.994 5.66-1.71-2.063a61.427 61.427 0 0 1 4.265-2.988l-.02-.078c-1.828.196-4.107.294-6.387.294H0V4.835h3.734c2.28 0 4.56.098 6.387.294l.02-.059a67.638 67.638 0 0 1-4.265-3.006L7.586 0l5.994 5.66Z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    </span>
                  </button>
                </div>

                {errorMsg && (
                  <p
                    id="newsletter-error"
                    className={styles.errorMessage}
                    role="alert"
                    data-testid="newsletter-error-msg"
                  >
                    {errorMsg}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Legal Strip ── */}
      <div className={styles.footerBottom} data-testid="footer-legal-strip">
        <div className={styles.bottomInner}>
          <div className={styles.bottomLegal}>
            <span className={styles.copyrightText}>
              © {currentYear} Akashic Store. All rights reserved.
            </span>

            <div className={styles.legalLinks}>
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  className={styles.legalLink}
                  onClick={(e) => e.preventDefault()}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.backToTopBtn}
            onClick={handleScrollToTop}
            aria-label="Scroll to top of page"
            data-testid="footer-back-to-top"
          >
            <span>Back to top</span>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}

export default StoreFooter;
