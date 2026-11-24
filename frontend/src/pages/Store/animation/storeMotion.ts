/**
 * Motion utilities and easing profiles derived from reference reverse-engineering.
 */

export const STORE_EASINGS = {
  // Osmo page transition ease
  osmo: 'cubic-bezier(0.625, 0.05, 0, 1)',
  // Energy snappy button/header ease
  energy: 'cubic-bezier(0.32, 0.72, 0, 1)',
  // Organic SVG stroke path ease
  pathEase: 'cubic-bezier(0.78, 0.18, 0.18, 1)',
  // Springy overshoot for logo badges and titles
  elasticOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  // Anticipatory retraction
  elasticIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  // Standard ease-out
  circOut: 'cubic-bezier(0, 0.55, 0.45, 1)',
} as const;

export const STORE_DURATIONS = {
  fast: 200,
  normal: 350,
  smooth: 500,
  portal: 850,
} as const;
