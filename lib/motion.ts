// lib/motion.ts
// Reusable motion tokens, easing functions, and timing configurations for CampusOS.

export const motionTokens = {
  easings: {
    easeOutCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
    easeOutExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  durations: {
    fast: 200,
    normal: 400,
    headerSlide: 700,
    counter: 1200,
  },
  delays: {
    header: 0,
    headlineLine1: 120,
    headlineLine2: 300,
    subhead: 280,
    cta: 400,
    statsBase: 480,
    statsStagger: 80,
  },
} as const;

/** Cubic bezier ease-out for JavaScript animations (e.g. stats count up). */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
