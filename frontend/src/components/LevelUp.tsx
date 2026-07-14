import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { springs, useMotionOK } from '../lib/motion';

/**
 * Fires once when the user's level actually increases.
 *
 * The XP bar has always crept up silently; crossing a level is the one moment
 * in this app that deserves a real celebration, so it gets the biggest burst
 * of embers the design allows — and then gets out of the way after 2.4s.
 *
 * The previous level is held in a ref rather than state so the very first
 * profile load can never trigger it: you should not be congratulated for
 * level 7 simply because you refreshed the page.
 */

const EMBERS = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2;
    return {
        angle,
        dist: 90 + Math.random() * 130,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 0.18,
    };
});

export default function LevelUp({ level }: { level: number | undefined }) {
    const motionOK = useMotionOK();
    const previous = useRef<number | null>(null);
    const [celebrating, setCelebrating] = useState<number | null>(null);

    useEffect(() => {
        if (level == null) return;

        // First real reading of the level — remember it, celebrate nothing.
        if (previous.current === null) {
            previous.current = level;
            return;
        }

        if (level > previous.current) {
            setCelebrating(level);
            const t = setTimeout(() => setCelebrating(null), 2400);
            previous.current = level;
            return () => clearTimeout(t);
        }

        previous.current = level;
    }, [level]);

    return (
        <AnimatePresence>
            {celebrating !== null && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    role="status"
                    aria-live="polite"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    {/* the room brightens */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(circle at 50% 50%, rgba(242,181,68,0.16) 0%, transparent 55%)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 2.2, times: [0, 0.2, 1] }}
                    />

                    {motionOK && EMBERS.map((e, i) => (
                        <motion.span
                            key={i}
                            style={{
                                position: 'absolute',
                                width: e.size,
                                height: e.size,
                                borderRadius: '50%',
                                background: i % 3 === 0 ? 'var(--copper-lit)' : 'var(--gold-lit)',
                                boxShadow: '0 0 8px var(--gold)',
                            }}
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{
                                x: Math.cos(e.angle) * e.dist,
                                y: Math.sin(e.angle) * e.dist - 40, // they rise as they fly
                                opacity: 0,
                                scale: 0.3,
                            }}
                            transition={{ duration: 1.6, delay: e.delay, ease: 'easeOut' }}
                        />
                    ))}

                    <motion.div
                        className="card"
                        style={{
                            textAlign: 'center',
                            padding: '1.5rem 2.5rem',
                            borderColor: 'var(--gold)',
                            boxShadow: 'var(--glow-ember)',
                            background: 'var(--surface)',
                        }}
                        initial={{ scale: 0.7, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -8 }}
                        transition={springs.ember}
                    >
                        <div className="eyebrow t-gold" style={{ marginBottom: '0.15rem' }}>The fire grows</div>
                        <div className="tally t-gold" style={{ fontSize: '2.75rem', lineHeight: 1.1 }}>
                            Level {celebrating}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
