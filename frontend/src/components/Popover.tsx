import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { springs, useMotionOK } from '../lib/motion';

/**
 * A panel anchored to a trigger, rendered at <body>.
 *
 * It has to be a portal. Every page in this app sits under PageTransition's
 * transform, which becomes the containing block for `position: fixed` and
 * traps the panel in the main column's stacking context — that is how the
 * range panel ended up sliding under the sidebar. From the body it measures
 * against the viewport and clamps itself inside it, so it can't be clipped
 * whatever the window is doing.
 *
 * Under 560px it stops pretending to be a dropdown and centres itself.
 */

const SHEET_UNDER = 560;
const EDGE = 12;

export default function Popover({
    open,
    onClose,
    anchorRef,
    children,
    width = 300,
    align = 'end',
    label,
}: {
    open: boolean;
    onClose: () => void;
    anchorRef: RefObject<HTMLElement | null>;
    children: ReactNode;
    width?: number;
    align?: 'start' | 'end';
    label?: string;
}) {
    const motionOK = useMotionOK();
    const panel = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

    useLayoutEffect(() => {
        if (!open) return;

        const place = () => {
            const el = anchorRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const w = Math.min(width, vw - EDGE * 2);
            const top = Math.min(r.bottom + 8, vh - 180);

            setBox({
                top,
                left: vw < SHEET_UNDER
                    ? Math.round((vw - w) / 2)
                    : Math.min(Math.max(EDGE, align === 'end' ? r.right - w : r.left), vw - w - EDGE),
                width: w,
                maxHeight: vh - top - EDGE,
            });
        };

        place();
        window.addEventListener('resize', place);
        // Capture phase: any scrolling ancestor should drag the panel along.
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, align, width, anchorRef]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!panel.current?.contains(t) && !anchorRef.current?.contains(t)) onClose();
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('mousedown', onDown);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('mousedown', onDown);
        };
    }, [open, onClose, anchorRef]);

    return createPortal(
        <AnimatePresence>
            {open && box && (
                <motion.div
                    ref={panel}
                    className="pop"
                    role="dialog"
                    aria-label={label}
                    initial={motionOK ? { opacity: 0, y: -8, scale: 0.97 } : false}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.13 } }}
                    transition={springs.settle}
                    style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
