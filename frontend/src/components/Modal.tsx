import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { modalPanel, overlay } from '../lib/motion';

/**
 * Every modal in the app. Previously each one unmounted instantly with no
 * exit animation at all — they vanished mid-gesture. This gives them all a
 * single enter/settle/exit, plus Escape-to-close and a real close button,
 * which none of them had.
 */
export default function Modal({
    open,
    onClose,
    title,
    children,
    width = 520,
    danger = false,
}: {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    width?: number;
    danger?: boolean;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="modal-overlay"
                    variants={overlay}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        className="modal"
                        style={{ maxWidth: width }}
                        variants={modalPanel}
                        role="dialog"
                        aria-modal="true"
                    >
                        {title && (
                            <div className="modal-head">
                                <h3 className={danger ? 't-cinder' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {title}
                                </h3>
                                <button className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="Close">
                                    <X size={17} />
                                </button>
                            </div>
                        )}
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
