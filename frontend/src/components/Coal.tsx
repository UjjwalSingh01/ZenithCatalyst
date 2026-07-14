import { motion } from 'motion/react';
import { format } from 'date-fns';
import { heatOf, HEAT_HEX, HEAT_LABEL, springs, useMotionOK } from '../lib/motion';

/**
 * One day in the month, rendered as a coal at its own temperature.
 *
 * The month then reads as a field of heat: you can see a cold streak from
 * across the room without decoding a legend. This replaces the old
 * green/amber/red dot, which said "good / ok / bad" — a judgement — where
 * this says "lit / burning / out", which is just what happened.
 */
export default function Coal({
  day,
  rate,
  isSelected,
  isToday,
  onClick,
}: {
  day: Date;
  rate: number;
  isSelected: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  const motionOK = useMotionOK();
  const heat = heatOf(rate);
  const alive = rate > 0;
  const hex = HEAT_HEX[heat];

  return (
    <motion.button
      onClick={onClick}
      whileHover={motionOK ? { y: -2 } : undefined}
      whileTap={motionOK ? { scale: 0.94 } : undefined}
      transition={springs.settle}
      aria-pressed={isSelected}
      aria-label={`${format(day, 'EEEE d MMMM')} — ${alive ? `${Math.round(rate)}% complete, ${HEAT_LABEL[heat].toLowerCase()}` : 'nothing logged'}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        padding: '0.4rem 0.2rem 0.5rem',
        borderRadius: 10,
        cursor: 'pointer',
        minWidth: 0,
        background: isSelected ? 'rgba(242, 181, 68, 0.1)' : 'transparent',
        border: `1px solid ${isSelected ? 'var(--gold)' : 'transparent'}`,
        color: 'inherit',
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: '0.68rem',
          color: isToday ? 'var(--gold)' : alive ? 'var(--ink-dim)' : 'var(--ash)',
          fontWeight: isToday ? 700 : 400,
        }}
      >
        {format(day, 'd')}
      </span>

      <span
        style={{
          position: 'relative',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: alive ? hex : 'var(--heat-0)',
          border: alive ? 'none' : '1px solid var(--line)',
          boxShadow: heat === 'lit' ? `0 0 9px ${hex}bb` : heat === 'burning' ? `0 0 5px ${hex}77` : 'none',
        }}
      >
        {/* A lit coal keeps a bright centre. */}
        {heat === 'lit' && (
          <motion.span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 4,
              borderRadius: '50%',
              background: 'var(--gold-lit)',
            }}
            animate={motionOK ? { opacity: [0.55, 1, 0.55] } : { opacity: 0.85 }}
            transition={motionOK ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
          />
        )}
      </span>

      {/* Today is marked by a hairline under the coal, not another colour. */}
      {isToday && !isSelected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 2,
            width: 14,
            height: 1.5,
            borderRadius: 99,
            background: 'var(--gold)',
          }}
        />
      )}
    </motion.button>
  );
}
