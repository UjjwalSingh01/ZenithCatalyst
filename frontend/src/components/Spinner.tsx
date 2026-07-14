import { motion } from 'motion/react';
import { useMotionOK } from '../lib/motion';

/** The one loading indicator in the app. */
export default function Spinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    const motionOK = useMotionOK();
    return (
        <motion.span
            aria-hidden
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                borderTopColor: 'transparent',
                display: 'inline-block',
                flexShrink: 0,
                opacity: 0.9,
            }}
            animate={motionOK ? { rotate: 360 } : undefined}
            transition={motionOK ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : undefined}
        />
    );
}

/** Full-page loading state — used while auth resolves and on the OAuth hop. */
export function FullPageSpinner({ label }: { label: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                minHeight: '100dvh',
            }}
            role="status"
        >
            <Spinner size={22} color="var(--copper)" />
            <span className="t-dim t-sm">{label}</span>
        </div>
    );
}
