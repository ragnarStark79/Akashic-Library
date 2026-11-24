import { useState, useRef, useEffect } from 'react';
import type { StoreViewMode } from '@/pages/Store/types/store';
import styles from './StoreGiftingPage.module.css';

export interface StoreGiftingPageProps {
  onNavigateStore: (view: StoreViewMode) => void;
  onSignInClick?: () => void;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  books: number;
  months: number;
  priceUsd: string;
  priceCad: string;
  subtitle: string;
  badge?: string;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'sub-1m',
    name: '1-Month Subscription',
    books: 3,
    months: 1,
    priceUsd: '$37.99',
    priceCad: '$53.99',
    subtitle: 'Billed once. Includes 3 hardcover books.',
  },
  {
    id: 'sub-3m',
    name: '3-Month Subscription',
    books: 9,
    months: 3,
    priceUsd: '$113.99',
    priceCad: '$161.99',
    subtitle: 'Billed once. Includes 9 hardcover books across 3 monthly boxes.',
    badge: 'Most Popular',
  },
  {
    id: 'sub-6m',
    name: '6-Month Subscription',
    books: 18,
    months: 6,
    priceUsd: '$227.99',
    priceCad: '$323.99',
    subtitle: 'Billed once. Includes 18 hardcover books across 6 monthly boxes.',
  },
  {
    id: 'sub-12m',
    name: '12-Month Subscription',
    books: 36,
    months: 12,
    priceUsd: '$455.99',
    priceCad: '$647.99',
    subtitle: 'Billed once. A full year of extraordinary curated reading (36 books).',
    badge: 'Best Value',
  },
];

const EDITORIAL_ROWS = [
  {
    title: 'They pick their own books',
    description:
      'We’ve got something for everyone. Choose from romance, horror, literary fiction, thriller, sci-fi, magical realism, and more!',
    image: '/gifting/features-image-01.webp',
    alt: 'Stack of colorful books with a pink and purple gift box tied with a lavender ribbon',
  },
  {
    title: 'Exclusive hardcovers',
    description:
      'They’ll receive beautiful hardcover editions exclusive to Akashic Book Club. Our copies include soft-touch covers, custom embossing, and custom design.',
    image: '/gifting/features-image-02.webp',
    alt: 'Row of exclusive hardcover spines in pastel and vibrant tones',
  },
  {
    title: 'Join the community!',
    description:
      'Each month features a new bookish challenge. Follow us on social media @akashiclibrary and participate in our reading challenges, community giveaways, and more.',
    image: '/gifting/features-image-03.webp',
    alt: 'Four colorful books arranged with rabbit-ear shaped bookmarks',
  },
];

const GIFTING_FAQS = [
  {
    id: 'gifting-faq-1',
    question: 'What does a gift subscription include?',
    answer:
      'Our boxes include 3 hardcover new releases, a bookmark per book and a postcard with a monthly challenge. Each month of a gift subscription includes 3 books. For example, 3 months = 9 books.',
  },
  {
    id: 'gifting-faq-2',
    question: 'How do I give a subscription?',
    answer:
      'When you buy a gift subscription you are instantly emailed an e-gift card to print out or forward to the recipient.',
  },
  {
    id: 'gifting-faq-3',
    question: 'How does the recipient redeem the gift subscription?',
    answer:
      'The e-gift card includes a confirmation # + instructions for redeeming the gift.',
  },
  {
    id: 'gifting-faq-4',
    question: 'What happens to the recipient’s account when the gift ends?',
    answer:
      'The gift recipient can choose to sign up for a regular monthly membership if they’d like.',
  },
  {
    id: 'gifting-faq-5',
    question: 'Can I gift to an existing Akashic member?',
    answer:
      'Yes, you can give a gift subscription to an existing member and we’ll apply it to their account.',
  },
];

export function StoreGiftingPage({
  onNavigateStore: _onNavigateStore,
  onSignInClick: _onSignInClick,
}: StoreGiftingPageProps) {
  const [region, setRegion] = useState<'USA' | 'Canada'>('USA');
  const [openFaqId, setOpenFaqId] = useState<string | null>('gifting-faq-1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScrollToSubscription = () => {
    const el = document.getElementById('subscription');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGiftPlan = (plan: SubscriptionPlan) => {
    const price = region === 'USA' ? plan.priceUsd : plan.priceCad;
    setToastMessage(`🎁 Selected ${plan.name} (${price} ${region === 'USA' ? 'USD' : 'CAD'}). Ready for gifting checkout!`);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.giftingRoot} data-testid="store-gifting-page">
      {/* ── SECTION 1: Gifting Hero ── */}
      <section className={styles.heroSection} aria-label="Gifting Hero">
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              A gift so good you’re going to want to borrow it
            </h1>
            <div className={styles.heroCtaWrap}>
              <button
                type="button"
                className={styles.giftNowBtn}
                onClick={handleScrollToSubscription}
                aria-label="Gift Now - Scroll to Subscriptions"
                data-testid="hero-gift-now-btn"
              >
                <span>Gift Now!</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className={styles.heroPressRow}>
              <span className={styles.pressLabel}>Mentioned by</span>
              <div className={styles.pressLogos}>
                <span className={styles.pressPill}>Publishers Weekly</span>
                <span className={styles.pressPill}>MSNBC</span>
                <span className={styles.pressPill}>Book Riot</span>
                <span className={styles.pressPill}>Travel + Leisure</span>
              </div>
            </div>
          </div>

          <div className={styles.heroVisualWrap}>
            <img
              src="/gifting/gift-visual-mobile.webp"
              alt="Akashic Curated Gift Box with hardcover books tied in festive ribbon"
              className={styles.heroVisualImg}
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Subscriptions ── */}
      <section
        id="subscription"
        className={styles.subscriptionSection}
        aria-label="Our Subscriptions"
        data-testid="gifting-subscriptions-section"
      >
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Our subscriptions</h2>
          <div className={styles.regionToggle} role="group" aria-label="Subscription Currency">
            <button
              type="button"
              className={`${styles.regionBtn} ${region === 'USA' ? styles.regionBtnActive : ''}`}
              onClick={() => setRegion('USA')}
              aria-pressed={region === 'USA'}
            >
              USA
            </button>
            <button
              type="button"
              className={`${styles.regionBtn} ${region === 'Canada' ? styles.regionBtnActive : ''}`}
              onClick={() => setRegion('Canada')}
              aria-pressed={region === 'Canada'}
            >
              Canada
            </button>
          </div>
        </div>

        <div className={styles.cardsGrid}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const price = region === 'USA' ? plan.priceUsd : plan.priceCad;
            return (
              <div key={plan.id} className={styles.subCard} data-testid={`subscription-card-${plan.id}`}>
                {plan.badge === 'Most Popular' && (
                  <span className={styles.popularBadge}>Most Popular</span>
                )}
                {plan.badge === 'Best Value' && (
                  <span className={styles.bestValueBadge}>Best Value</span>
                )}
                <h3 className={styles.cardTitle}>{plan.name}</h3>
                <div className={styles.cardPrice}>{price}</div>
                <p className={styles.cardSubtitle}>{plan.subtitle}</p>
                <button
                  type="button"
                  className={styles.cardActionBtn}
                  onClick={() => handleGiftPlan(plan)}
                  aria-label={`Gift ${plan.name} for ${price}`}
                  data-testid={`gift-btn-${plan.id}`}
                >
                  Gift this plan →
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3: Animated Marquee ── */}
      <section className={styles.marqueeSection} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <span key={idx} className={styles.marqueeText}>
              A gift outside of the box <span className={styles.marqueeDot}>✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: Editorial Feature Rows ── */}
      <section className={styles.featuresSection} aria-label="Why Akashic Gifting">
        {EDITORIAL_ROWS.map((row, idx) => {
          const isReversed = idx % 2 === 1;
          return (
            <div
              key={row.title}
              className={`${styles.featureRow} ${isReversed ? styles.featureRowReversed : ''}`}
            >
              <div className={styles.featureContent}>
                <h3 className={styles.featureTitle}>{row.title}</h3>
                <p className={styles.featureDesc}>{row.description}</p>
              </div>
              <div className={styles.featureVisual}>
                <img
                  src={row.image}
                  alt={row.alt}
                  className={styles.featureImg}
                  loading="lazy"
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* ── SECTION 5: Explicitly OMITTING the Gift Box cyan app panel as instructed ── */}

      {/* ── SECTION 6: Gifting FAQ ── */}
      <section
        className={styles.faqSection}
        aria-label="Frequently Asked Questions About Gifting"
        data-testid="gifting-faq-section"
      >
        <div className={styles.faqContainer}>
          <h2 className={styles.faqHeading}>Gifting FAQ</h2>
          <div className={styles.accordionList} role="presentation">
            {GIFTING_FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}
                >
                  <button
                    type="button"
                    className={styles.accordionTrigger}
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${faq.id}`}
                    id={`faq-question-${faq.id}`}
                  >
                    <span>{faq.question}</span>
                    <span className={styles.accordionIcon} aria-hidden="true">
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-answer-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-question-${faq.id}`}
                      className={styles.accordionPanel}
                    >
                      <p style={{ margin: 0 }}>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.giftToast} role="status">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#F472B6',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default StoreGiftingPage;
