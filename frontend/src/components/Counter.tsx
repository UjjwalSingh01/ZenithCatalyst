import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { springs, useMotionOK } from '../lib/motion';

/**
 * A number that rolls up to its value instead of snapping to it. Used for
 * every tally in the app — XP, streaks, stat tiles — so an earned number
 * visibly accrues rather than just appearing.
 */
export default function Counter({
  value,
  suffix = '',
  className = 'tally',
  style,
}: {
  value: number;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const motionOK = useMotionOK();
  const raw = useMotionValue(0);
  const spring = useSpring(raw, springs.ember);
  const text = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (motionOK) raw.set(value);
    else spring.jump(value);
  }, [value, motionOK, raw, spring]);

  return (
    <motion.span className={className} style={style}>
      {text}
    </motion.span>
  );
}
