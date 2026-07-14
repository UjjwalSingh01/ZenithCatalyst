import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { springs, useMotionOK } from '../lib/motion';

/**
 * Completing a habit is the emotional peak of this app, and it used to be an
 * instant, silent toggle. Here it is an ignition: the box strikes, catches
 * gold, and throws a handful of embers.
 *
 * The burst only fires on the transition *into* completed, and only from a
 * real click — never on mount, or a list of finished habits would fire a
 * dozen bursts at once on page load.
 */

const SPARKS = [0, 60, 120, 180, 240, 300];

export default function HabitCheck({
  checked,
  onChange,
  size = 'md',
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: 'sm' | 'md';
  label: string;
}) {
  const motionOK = useMotionOK();
  const [burst, setBurst] = useState(0);

  const box = size === 'md' ? 22 : 16;
  const radius = size === 'md' ? 7 : 5;

  const handle = () => {
    if (!checked && motionOK) setBurst((n) => n + 1);
    onChange(!checked);
  };

  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <motion.button
        type="button"
        onClick={handle}
        aria-pressed={checked}
        aria-label={checked ? `Mark "${label}" not done` : `Mark "${label}" done`}
        animate={checked && motionOK ? { scale: [1, 1.22, 1] } : undefined}
        transition={springs.strike}
        whileTap={motionOK ? { scale: 0.88 } : undefined}
        style={{
          width: box,
          height: box,
          borderRadius: radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: checked ? 'var(--gold)' : 'transparent',
          border: `2px solid ${checked ? 'var(--gold)' : 'var(--cold-dim)'}`,
          boxShadow: checked ? '0 0 12px rgba(242, 181, 68, 0.5)' : 'none',
          transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
          padding: 0,
        }}
      >
        <AnimatePresence>
          {checked && (
            <motion.span
              key="mark"
              initial={motionOK ? { scale: 0, rotate: -25 } : false}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={springs.strike}
              style={{ display: 'flex', color: '#231206' }}
            >
              <Check size={size === 'md' ? 13 : 10} strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Embers thrown by the strike. */}
      {burst > 0 && (
        <span
          aria-hidden
          key={burst}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        >
          {SPARKS.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const dist = box * 1.15;
            return (
              <motion.span
                key={angle}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(rad) * dist,
                  y: Math.sin(rad) * dist,
                  opacity: 0,
                  scale: 0.2,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: 3,
                  height: 3,
                  marginLeft: -1.5,
                  marginTop: -1.5,
                  borderRadius: '50%',
                  background: 'var(--gold-lit)',
                  boxShadow: '0 0 5px var(--gold)',
                }}
              />
            );
          })}
        </span>
      )}
    </span>
  );
}
