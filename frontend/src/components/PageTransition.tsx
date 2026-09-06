import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { springs, useMotionOK } from '../lib/motion';

/**
 * Wraps a routed page so navigating between them is a settle, not a cut.
 *
 * Two things here are deliberate, and both were bugs.
 *
 * **It animates to explicit values, not to a variant label.** It used to carry
 * `variants={fadeRise}` with `animate="show"`. A variant label does not stay on
 * the element that declares it: Motion broadcasts it down to every descendant
 * motion component that has no `animate` of its own. Those labels, "hidden" and
 * "show", are the same names the pages use for their own lists — `staggerList`
 * declares them too — so the page wrapper and the contents of whichever page it
 * held were resolving one shared animation. On the heaviest page that never
 * finished settling and the wrapper stayed at `hidden`: opacity 0, with a fully
 * rendered page inside it. The route looked blank, and navigating away and back
 * built a new wrapper, which is why a second click "fixed" it.
 *
 * Plain objects cannot propagate, so the wrapper now animates only itself and
 * page content is free to use whatever variant names it likes.
 *
 * **It only animates in.** There is no `exit`, because there is no
 * AnimatePresence around it any more: see the note in AppLayout. A page is
 * remounted by its route key and fades in from there. Nothing has to be waited
 * on, so nothing can fail to arrive.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
    const motionOK = useMotionOK();

    return (
        <motion.div
            initial={motionOK ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.settle}
        >
            {children}
        </motion.div>
    );
}
