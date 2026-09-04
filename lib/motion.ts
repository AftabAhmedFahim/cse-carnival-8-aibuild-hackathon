// lib/motion.ts
// Reusable motion tokens, easing functions, and timing configurations for CampusOS.

export const motionTokens = {
  easings: {
    easeOutCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
    easeOutExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    // Physics-based spring and bounce curves generated with CSS linear()
    spring: "linear(0, 0.016 0.5%, 0.06 1%, 0.226 2%, 1.116 5.4%, 1.375 6.6%, 1.527 7.7%, 1.565 8.2%, 1.585 8.8%, 1.581 9.3%, 1.559 9.8%, 1.458 10.9%, 0.937 14.3%, 0.784 15.5%, 0.693 16.6%, 0.67 17.1%, 0.657 17.7%, 0.671 18.7%, 0.729 19.8%, 1.042 23.3%, 1.13 24.5%, 1.182 25.6%, 1.201 26.7%, 1.192 27.7%, 1.156 28.8%, 0.977 32.2%, 0.925 33.4%, 0.894 34.5%, 0.882 35.6%, 0.887 36.6%, 0.907 37.7%, 1.045 42.4%, 1.069 44.5%, 1.059 46.3%, 0.979 50.9%, 0.96 53.4%, 0.966 55.3%, 1.013 59.9%, 1.024 62.3%, 0.986 71.2%, 1.008 79.9%, 0.995 88.9%, 1)",
    bounce: "linear(0, 0.214 14.7%, 0.386 23.7%, 0.598 31.9%, 0.999 44.7%, 0.807 52.6%, 0.762 56%, 0.747 59.4%, 0.758 62.4%, 0.793 65.6%, 0.999 77.4%, 0.961 81.2%, 0.949 84.8%, 0.956 88%, 0.993 95.5%, 1)",
  },
  durations: {
    micro: 150,
    fast: 200,
    normal: 400,
    spring: 600,
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
    cardStagger: 60,
  },
} as const;

/** Cubic bezier ease-out for JavaScript animations (e.g. stats count up). */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Physics spring approximation function for JS animations */
export function easeOutBack(t: number, overshoot = 1.70158): number {
  return 1 + (overshoot + 1) * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
}
