import type { WhyAkashicCapsule } from '../types';

/**
 * Five floating feature capsules for Why Akashic section.
 *
 * All commercial messaging is grounded in verified Akashic Store capabilities:
 * - "Range of genres": Verified 11 core reading categories.
 * - "Direct delivery": Verified doorstep fulfillment policy.
 * - "Thoughtfully priced": Verified fair artisanal pricing model.
 * - "Quality editions": Verified archival physical editions & tactile goods.
 * - "Curated books": Verified monthly selective editorial reveals.
 */
export const WHY_AKASHIC_CAPSULES: WhyAkashicCapsule[] = [
  {
    id: 'genres',
    text: 'Range of genres',
    variant: 'first',
    backgroundColor: '#FF008C', // var(--magenta)
    textColor: '#FFFFFF',
    rotationDesktop: -5,
    rotationTablet: -10,
    rotationMobile: -8,
  },
  {
    id: 'delivery',
    text: 'Direct delivery',
    variant: 'second',
    backgroundColor: '#F9A220', // var(--orange)
    textColor: '#670A2E',       // var(--wine)
    rotationDesktop: -1.8,
    rotationTablet: 5,
    rotationMobile: 4,
  },
  {
    id: 'pricing',
    text: 'Thoughtfully priced',
    variant: 'third',
    backgroundColor: '#9982DE', // var(--periwinkle)
    textColor: '#FFFFFF',
    rotationDesktop: 2.5,
    rotationTablet: 2,
    rotationMobile: 2,
  },
  {
    id: 'editions',
    text: 'Quality editions',
    variant: 'fourth',
    backgroundColor: '#1CE8ED', // var(--cyan)
    textColor: '#3B308F',       // var(--violet)
    rotationDesktop: 5.8,
    rotationTablet: 6,
    rotationMobile: 5,
  },
  {
    id: 'curated',
    text: 'Curated books',
    variant: 'fifth',
    backgroundColor: '#857521', // var(--olive)
    textColor: '#FFFFFF',
    rotationDesktop: -5.3,
    rotationTablet: -5,
    rotationMobile: -4,
  },
];
