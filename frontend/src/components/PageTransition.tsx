import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeRise, useMotionOK } from '../lib/motion';

/** Wraps a routed page so navigating between them is a settle, not a cut. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const motionOK = useMotionOK();
  if (!motionOK) return <>{children}</>;

  return (
    <motion.div variants={fadeRise} initial="hidden" animate="show" exit="exit">
      {children}
    </motion.div>
  );
}
