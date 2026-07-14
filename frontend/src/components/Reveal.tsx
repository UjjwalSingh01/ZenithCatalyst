import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { springs, useMotionOK } from '../lib/motion';

/**
 * Reveals its children once, as they scroll into view. Used on the long pages
 * (Analytics, Profile) where content below the fold would otherwise be fully
 * rendered before you ever reach it.
 *
 * `once: true` matters: a section that re-animates every time it re-enters the
 * viewport is the single most irritating scroll effect there is.
 */
export default function Reveal({
    children,
    delay = 0,
    y = 14,
}: {
    children: ReactNode;
    delay?: number;
    y?: number;
}) {
    const motionOK = useMotionOK();
    if (!motionOK) return <>{children}</>;

    return (
        <motion.div
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -80px 0px' }}
            transition={{ ...springs.settle, delay }}
        >
            {children}
        </motion.div>
    );
}
