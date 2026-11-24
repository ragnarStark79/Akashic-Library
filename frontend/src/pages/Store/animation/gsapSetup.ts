import { gsap } from 'gsap';

let gsapInitialized = false;

/**
 * Safely initialize GSAP defaults in client environment
 */
export function initGSAP() {
  if (typeof window === 'undefined' || gsapInitialized) return gsap;

  gsap.defaults({
    duration: 0.6,
    ease: 'power2.out',
  });

  gsapInitialized = true;
  return gsap;
}

export { gsap };
