import { useReducedMotion, type Variants, type Transition } from 'motion/react';

/**
 * Single source of motion truth. Components import springs and variants from
 * here rather than hand-rolling transitions, so the app moves like one thing.
 *
 * Ember's motion is slow-burn: things settle and swell rather than pop.
 */

export const springs = {
  /** UI chrome — nav, modals, list reflow. Crisp, no overshoot to speak of. */
  settle: { type: 'spring', stiffness: 260, damping: 30 } as Transition,
  /** Organic — the hearth, the ignite. Heavier, with a little bloom. */
  ember: { type: 'spring', stiffness: 120, damping: 18, mass: 0.9 } as Transition,
  /** The snap on a completed habit. Deliberately overshoots. */
  strike: { type: 'spring', stiffness: 520, damping: 14, mass: 0.6 } as Transition,
} as const;

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: springs.settle },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

/** Parent of a staggered list. Children should use `fadeRise`. */
export const staggerList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const overlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: springs.settle },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.14 } },
};

export const toastIn: Variants = {
  hidden: { opacity: 0, x: 24, scale: 0.96 },
  show: { opacity: 1, x: 0, scale: 1, transition: springs.settle },
  exit: { opacity: 0, x: 16, scale: 0.95, transition: { duration: 0.16 } },
};

/**
 * True when the user has not asked for reduced motion. Every animated
 * component gates on this; the ambient glow and the ember burst switch off
 * entirely rather than merely shortening.
 */
export function useMotionOK(): boolean {
  return !useReducedMotion();
}

/* ── Heat ────────────────────────────────────────────────────────────
   The one function that decides what temperature a completion rate is.
   Everything that shows heat — coals, the hearth, forecast bars, rings —
   reads from here, so a 60% day looks identical everywhere in the app. */

export type Heat = 'out' | 'cooling' | 'burning' | 'lit';

export function heatOf(rate: number): Heat {
  if (rate <= 0) return 'out';
  if (rate < 40) return 'cooling';
  if (rate < 80) return 'burning';
  return 'lit';
}

/** Hex for a heat level — for SVG fills and inline strokes. */
export const HEAT_HEX: Record<Heat, string> = {
  out: '#2a1f1c',
  cooling: '#8f5334',
  burning: '#c97b4e',
  lit: '#f2b544',
};

/** How a heat level should be described to a person. Errors and empty
    states get direction, not mood — so does a cold day. */
export const HEAT_LABEL: Record<Heat, string> = {
  out: 'Went out',
  cooling: 'Barely lit',
  burning: 'Burning',
  lit: 'Fully lit',
};
