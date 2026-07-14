import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { springs, useMotionOK } from '../lib/motion';
import { AuthHearth } from './Art';

/**
 * The shell behind Login and Register. The mark is a fire that lights itself
 * on arrival — the first thing the product asks you to do is keep one going,
 * so the first thing it shows you is one catching.
 */
export default function AuthShell({
    title,
    subtitle,
    children,
    footer,
    width = 420,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
    width?: number;
}) {
    const motionOK = useMotionOK();

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 1rem',
                position: 'relative',
                zIndex: 1,
            }}
        >
            <motion.div
                style={{ width: '100%', maxWidth: width }}
                initial={motionOK ? { opacity: 0, y: 14 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.settle}
            >
                {/* The hero states the thesis before asking for anything: this
                    is a fire, and it is your job to keep it. */}
                <div className="t-center" style={{ marginBottom: '1.75rem' }}>
                    <motion.div
                        style={{ display: 'inline-flex' }}
                        initial={motionOK ? { scale: 0.85, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ ...springs.ember, delay: 0.05 }}
                    >
                        <AuthHearth width={230} />
                    </motion.div>

                    <h1 style={{ marginTop: '0.25rem', fontSize: '2rem' }}>Zenith Catalyst</h1>
                    <p className="t-sm t-ash">A habit is a fire. Feed it daily, or it goes out.</p>
                </div>

                <div className="card card--static" style={{ padding: '1.75rem' }}>
                    <h2 style={{ marginBottom: '0.2rem' }}>{title}</h2>
                    <p className="t-sm" style={{ marginBottom: '1.5rem' }}>{subtitle}</p>
                    {children}
                </div>

                <p className="t-center t-sm" style={{ marginTop: '1.25rem' }}>{footer}</p>
            </motion.div>
        </div>
    );
}
