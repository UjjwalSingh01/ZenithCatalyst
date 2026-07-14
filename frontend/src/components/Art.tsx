import { motion } from 'motion/react';
import { useMotionOK } from '../lib/motion';

/**
 * The app's illustrations, authored as inline SVG in the Ember palette.
 *
 * Deliberately not raster art: these inherit the theme's custom properties,
 * stay crisp at any size, cost nothing over the network, and — because they
 * are real DOM — can hold the one small animated detail each of them needs.
 *
 * They share one drawing language: hairline copper structure, gold only where
 * something is genuinely alight, cold blue where it is not. An empty screen is
 * an invitation to act, so each of these shows a fire that *could* be lit —
 * never a shrug, a wilted plant, or an apology.
 */

const STROKE = { fill: 'none', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

// ─── Habits: nothing to light yet ───────────────────────────────────
export function UnlitKindling({ size = 116 }: { size?: number }) {
    const ok = useMotionOK();
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
            {/* kindling, stacked and waiting */}
            <g stroke="var(--cold)" {...STROKE} opacity={0.75}>
                <path d="M48 82 L56 54" />
                <path d="M72 82 L64 54" />
                <path d="M60 84 L60 50" />
            </g>
            <g stroke="var(--copper-deep)" strokeWidth={7} strokeLinecap="round" fill="none">
                <path d="M28 92 L92 78" />
                <path d="M28 78 L92 92" />
            </g>

            {/* the one spark — small, patient, and the whole point */}
            <motion.g
                animate={ok ? { opacity: [0.35, 1, 0.35], scale: [0.9, 1.12, 0.9] } : { opacity: 0.8 }}
                transition={ok ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
                style={{ transformOrigin: '60px 38px' }}
            >
                <circle cx="60" cy="38" r="4" fill="var(--gold)" />
                <circle cx="60" cy="38" r="9" fill="var(--gold)" opacity={0.18} />
                <g stroke="var(--gold)" strokeWidth={1.6} strokeLinecap="round">
                    <path d="M60 22 L60 27" />
                    <path d="M47 30 L50 33" />
                    <path d="M73 30 L70 33" />
                </g>
            </motion.g>
        </svg>
    );
}

// ─── Homepage: a day with nothing scheduled ─────────────────────────
export function ColdHearth({ size = 116 }: { size?: number }) {
    const ok = useMotionOK();
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
            <g stroke="var(--copper-deep)" {...STROKE}>
                <path d="M24 96 V56 a36 36 0 0 1 72 0 V96" />
                <path d="M12 96 H108" strokeWidth={3} />
                <path d="M36 96 V66 a24 24 0 0 1 48 0 V96" opacity={0.45} />
            </g>

            {/* dead coals — the fire was here, it just isn't now */}
            <g fill="var(--heat-0)" stroke="var(--cold-dim)" strokeWidth={1.2}>
                <ellipse cx="48" cy="89" rx="9" ry="5" />
                <ellipse cx="66" cy="91" rx="11" ry="5" />
                <ellipse cx="78" cy="87" rx="7" ry="4" />
            </g>

            {/* the last thread of smoke, still rising */}
            {ok && (
                <motion.path
                    d="M60 80 c-6 -9, 6 -14, 0 -23 c-5 -8, 4 -12, 1 -18"
                    stroke="var(--cold)"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    fill="none"
                    animate={{ opacity: [0, 0.5, 0], y: [4, -8, -16] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeOut' }}
                />
            )}
        </svg>
    );
}

// ─── Reminders: no nudges set ───────────────────────────────────────
export function SilentBell({ size = 116 }: { size?: number }) {
    const ok = useMotionOK();
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
            <motion.g
                style={{ transformOrigin: '60px 30px' }}
                animate={ok ? { rotate: [0, -7, 6, -3, 0] } : undefined}
                transition={ok ? { duration: 2.2, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' } : undefined}
            >
                <g stroke="var(--copper)" {...STROKE}>
                    <path d="M60 26 v6" />
                    <path d="M36 82 v-22 a24 24 0 0 1 48 0 v22" />
                    <path d="M28 82 h64" strokeWidth={3} />
                </g>
                <path d="M52 90 a8 8 0 0 0 16 0" stroke="var(--copper)" {...STROKE} />
                <circle cx="60" cy="26" r="4" fill="var(--gold)" />
            </motion.g>

            {/* sound that hasn't happened yet */}
            {ok && [0, 1].map((i) => (
                <motion.path
                    key={i}
                    d={i === 0 ? 'M96 46 a26 26 0 0 1 0 30' : 'M24 46 a26 26 0 0 0 0 30'}
                    stroke="var(--gold)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="none"
                    animate={{ opacity: [0, 0.55, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3.2, delay: 0.25, ease: 'easeOut' }}
                />
            ))}
        </svg>
    );
}

// ─── Coaching: the machine, waiting ─────────────────────────────────
export function CoachOrb({ size = 116 }: { size?: number }) {
    const ok = useMotionOK();
    // Cyan and geometric on purpose. The coach is not a hearth — it is
    // an instrument, and it should never feel like one of your fires.
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
            <motion.g
                style={{ transformOrigin: '60px 60px' }}
                animate={ok ? { rotate: 360 } : undefined}
                transition={ok ? { duration: 28, repeat: Infinity, ease: 'linear' } : undefined}
            >
                <path
                    d="M60 20 L95 40 V80 L60 100 L25 80 V40 Z"
                    stroke="var(--cyan)"
                    strokeWidth={1.6}
                    fill="none"
                    opacity={0.42}
                />
                {[[60, 20], [95, 40], [95, 80], [60, 100], [25, 80], [25, 40]].map(([x, y], i) => (
                    <motion.circle
                        key={i}
                        cx={x} cy={y} r={3}
                        fill="var(--cyan)"
                        animate={ok ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.7 }}
                        transition={ok ? { duration: 2.4, repeat: Infinity, delay: i * 0.28, ease: 'easeInOut' } : undefined}
                    />
                ))}
            </motion.g>

            <circle cx="60" cy="60" r="17" fill="var(--cyan)" opacity={0.1} />
            <motion.circle
                cx="60" cy="60" r="9"
                fill="var(--cyan)"
                animate={ok ? { r: [8, 10.5, 8], opacity: [0.65, 1, 0.65] } : { opacity: 0.85 }}
                transition={ok ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
            />
        </svg>
    );
}

// ─── Analytics / summary: no record to read ─────────────────────────
export function BlankLedger({ size = 116 }: { size?: number }) {
    const ok = useMotionOK();
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
            <g stroke="var(--copper-deep)" {...STROKE}>
                <path d="M28 22 h52 l14 14 v62 H28 Z" />
                <path d="M80 22 v14 h14" />
            </g>
            <g stroke="var(--cold-dim)" strokeWidth={2} strokeLinecap="round">
                <path d="M40 52 h40" />
                <path d="M40 62 h40" />
                <path d="M40 72 h26" />
            </g>
            {/* the line you haven't drawn yet */}
            {ok && (
                <motion.path
                    d="M40 88 L54 88 L68 88 L82 88"
                    stroke="var(--gold)"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}
        </svg>
    );
}

// ─── Quests: none running ───────────────────────────────────────────
export function QuestPennant({ size = 116 }: { size?: number }) {
    const ok = useMotionOK();
    return (
        <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
            <path d="M40 100 V22" stroke="var(--copper-deep)" strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <path d="M26 100 h28" stroke="var(--copper-deep)" strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <motion.path
                d="M40 26 L92 38 L40 54 Z"
                fill="var(--copper)"
                stroke="var(--copper-lit)"
                strokeWidth={2}
                strokeLinejoin="round"
                style={{ transformOrigin: '40px 40px' }}
                animate={ok ? { skewY: [0, -3.5, 1.5, 0] } : undefined}
                transition={ok ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : undefined}
            />
            <motion.circle
                cx="40" cy="22" r="4.5"
                fill="var(--gold)"
                animate={ok ? { opacity: [0.55, 1, 0.55] } : { opacity: 0.9 }}
                transition={ok ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
            />
        </svg>
    );
}

// ─── Auth hero: the thesis, stated once ─────────────────────────────
export function AuthHearth({ width = 230 }: { width?: number }) {
    const ok = useMotionOK();
    return (
        <svg width={width} height={width * 0.7} viewBox="0 0 200 140" aria-hidden>
            <defs>
                <radialGradient id="auth-glow" cx="50%" cy="72%" r="52%">
                    <stop offset="0%" stopColor="#f2b544" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#f2b544" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="auth-flame" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#8f5334" />
                    <stop offset="42%" stopColor="#c97b4e" />
                    <stop offset="100%" stopColor="#f2b544" />
                </linearGradient>
            </defs>

            {/* the heat it throws */}
            <motion.ellipse
                cx="100" cy="100" rx="82" ry="54"
                fill="url(#auth-glow)"
                animate={ok ? { opacity: [0.6, 1, 0.6], scale: [1, 1.06, 1] } : { opacity: 0.8 }}
                transition={ok ? { duration: 5.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
                style={{ transformOrigin: '100px 100px' }}
            />

            {/* stones */}
            <g fill="none" stroke="var(--copper-deep)" strokeWidth={2.5} strokeLinecap="round">
                <path d="M44 122 h112" strokeWidth={3} />
                <path d="M52 122 a10 8 0 0 1 20 0" />
                <path d="M128 122 a10 8 0 0 1 20 0" />
            </g>

            {/* logs */}
            <g stroke="var(--copper-deep)" strokeWidth={7} strokeLinecap="round">
                <path d="M74 116 L126 106" />
                <path d="M74 106 L126 116" />
            </g>

            {/* the fire itself */}
            <motion.g
                style={{ transformOrigin: '100px 112px' }}
                animate={ok ? { scaleY: [1, 1.07, 0.96, 1], scaleX: [1, 0.96, 1.04, 1] } : undefined}
                transition={ok ? { duration: 2.1, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
                <path
                    d="M100 40 c12 26, 30 34, 30 50 c0 18, -13 28, -30 28 c-17 0, -30 -10, -30 -28 c0 -16, 18 -24, 30 -50 Z"
                    fill="url(#auth-flame)"
                />
                <path
                    d="M100 74 c6 12, 13 15, 13 25 c0 10, -6 15, -13 15 c-7 0, -13 -5, -13 -15 c0 -10, 7 -13, 13 -25 Z"
                    fill="#ffd27d"
                    opacity={0.92}
                />
            </motion.g>

            {/* embers lifting off */}
            {ok && [
                { x: 78, d: 0, drift: -9 },
                { x: 100, d: 1.1, drift: 5 },
                { x: 122, d: 2.3, drift: 10 },
            ].map((e, i) => (
                <motion.circle
                    key={i}
                    cx={e.x} r={2}
                    fill="#ffd27d"
                    initial={{ cy: 94, opacity: 0 }}
                    animate={{ cy: [94, 16], cx: [e.x, e.x + e.drift], opacity: [0, 0.95, 0] }}
                    transition={{ duration: 3.4, repeat: Infinity, delay: e.d, ease: 'easeOut' }}
                />
            ))}
        </svg>
    );
}
