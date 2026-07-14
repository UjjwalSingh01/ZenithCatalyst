import { motion } from 'motion/react';
import { heatOf, HEAT_HEX, HEAT_LABEL, useMotionOK } from '../lib/motion';

/**
 * The Hearth — the one element in this app allowed to raise its voice.
 *
 * A day's completion rate isn't a percentage on a ring, it's a fire: the
 * flame's height, brightness and flicker amplitude all read straight off
 * `rate`. At 0 it is a dark, still coal. At 100 it burns full gold and
 * throws embers.
 */

const FLAME = 'M50 6 C62 31, 79 40, 79 60 C79 80, 66 93, 50 93 C34 93, 21 80, 21 60 C21 40, 38 31, 50 6 Z';
const CORE = 'M50 40 C57 53, 64 57, 64 68 C64 81, 58 89, 50 89 C42 89, 36 81, 36 68 C36 57, 43 53, 50 40 Z';

const EMBERS = [
  { x: 34, delay: 0, drift: -7 },
  { x: 50, delay: 0.8, drift: 4 },
  { x: 64, delay: 1.5, drift: 8 },
  { x: 42, delay: 2.2, drift: -3 },
];

export default function Hearth({
  rate,
  size = 132,
}: {
  rate: number;
  size?: number;
}) {
  const motionOK = useMotionOK();
  const pct = Math.max(0, Math.min(100, Math.round(rate)));
  const heat = heatOf(pct);
  const alive = pct > 0;

  // Everything the fire does is a function of how well the day went.
  const height = 0.3 + (pct / 100) * 0.7; // how tall it stands
  const brightness = 0.4 + (pct / 100) * 0.6; // how hard it burns
  const flicker = (pct / 100) * 0.05; // how much it dances
  const throwsEmbers = motionOK && pct >= 40;

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      role="img"
      aria-label={`${pct}% of today's habits complete — ${HEAT_LABEL[heat].toLowerCase()}`}
    >
      {/* The heat the fire throws into the room. The only ambient motion
          in the app, and it only exists when something is actually burning. */}
      {alive && (
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '-22%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${HEAT_HEX[heat]}44 0%, transparent 68%)`,
            pointerEvents: 'none',
          }}
          animate={motionOK ? { scale: [1, 1.09, 1], opacity: [0.55, 0.9, 0.55] } : { opacity: 0.7 }}
          transition={motionOK ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
      )}

      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'relative' }}>
        <defs>
          <radialGradient id="hearth-flame" cx="50%" cy="76%" r="62%">
            <stop offset="0%" stopColor="var(--gold-lit)" />
            <stop offset="45%" stopColor={HEAT_HEX[heat]} />
            <stop offset="100%" stopColor="var(--copper-deep)" />
          </radialGradient>
          <radialGradient id="hearth-core" cx="50%" cy="80%" r="55%">
            <stop offset="0%" stopColor="#fff6e2" />
            <stop offset="100%" stopColor="var(--gold-lit)" />
          </radialGradient>
          <filter id="hearth-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        {/* The coal bed. Always present — even a dead fire leaves this. */}
        <ellipse cx="50" cy="93" rx="27" ry="5" fill={alive ? HEAT_HEX[heat] : 'var(--heat-0)'} opacity={alive ? 0.55 : 1} />

        {alive && (
          <motion.g
            style={{ transformOrigin: '50px 93px' }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={
              motionOK
                ? {
                    scaleY: [height, height * (1 + flicker), height * (1 - flicker * 0.6), height],
                    scaleX: [1, 1 - flicker * 0.7, 1 + flicker * 0.5, 1],
                    opacity: brightness,
                  }
                : { scaleY: height, scaleX: 1, opacity: brightness }
            }
            transition={
              motionOK
                ? {
                    scaleY: { duration: 1.7, repeat: Infinity, ease: 'easeInOut' },
                    scaleX: { duration: 2.3, repeat: Infinity, ease: 'easeInOut' },
                    opacity: { duration: 0.8 },
                  }
                : { duration: 0.4 }
            }
          >
            <path d={FLAME} fill="url(#hearth-flame)" filter="url(#hearth-soft)" opacity={0.85} />
            <path d={FLAME} fill="url(#hearth-flame)" />
            {pct >= 55 && <path d={CORE} fill="url(#hearth-core)" opacity={0.9} />}
          </motion.g>
        )}

        {/* Embers only lift off a fire that's genuinely going. */}
        {throwsEmbers &&
          EMBERS.map((e, i) => (
            <motion.circle
              key={i}
              cx={e.x}
              r={1.5}
              fill="var(--gold-lit)"
              initial={{ cy: 74, opacity: 0 }}
              animate={{ cy: [74, 12], cx: [e.x, e.x + e.drift], opacity: [0, 0.9, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: e.delay, ease: 'easeOut' }}
            />
          ))}
      </svg>

      {/* The tally sits in the fire. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          className="tally"
          style={{
            fontSize: size * 0.24,
            color: alive ? '#2a1408' : 'var(--cold)',
            textShadow: alive ? '0 1px 6px rgba(255, 220, 150, 0.55)' : 'none',
            marginTop: size * 0.14,
          }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}
