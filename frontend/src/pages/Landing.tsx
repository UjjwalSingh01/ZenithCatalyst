import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useScroll, useTransform, type Variants } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Flame, Layers, Trophy, TrendingUp, Sparkles, Bell, Award, ArrowRight } from 'lucide-react';
import Hearth from '../components/Hearth';
import Coal from '../components/Coal';
import Reveal from '../components/Reveal';
import EmberDrift from '../components/EmberDrift';
import SiteFooter from '../components/SiteFooter';
import { fadeRise, staggerList, springs, useMotionOK, HEAT_HEX } from '../lib/motion';
import { useHeatSurface, useMagnetic, useTilt } from '../lib/cursor';

/**
 * The public landing page, and the only Persuade surface in the product.
 *
 * The visuals are the real Hearth and Coal components running live rather
 * than pictures of them, because the fire is the one thing here nobody
 * else has. Nothing else is invented either: palette, radii, springs and
 * the heat scale all come from the app.
 *
 * Motion thesis: the cursor is a hand near the fire. It carries heat, so
 * coals brighten under it, surfaces bloom where it rests, and the flame
 * leans toward it. Everything in lib/cursor.ts serves that one idea; a
 * hover-lift with no story would have been cheaper and meant nothing.
 */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/* An illustrative month, not a real user's. It is shaped like the thing
   the product is for: a scrappy first week, one real collapse, then a
   run that holds. A month of perfect days would demonstrate nothing. */
const DEMO_MONTH = new Date(2026, 0, 1);
const DEMO_RATES = [
    0, 0, 33, 0, 0, 50, 20,
    0, 60, 40, 0, 75, 55, 80,
    100, 60, 85, 100, 100, 70, 90,
    100, 100, 85, 100, 100, 75, 100,
    100, 90, 100,
];

/* The hero fire settles here. A plausible day, not a victory lap. */
const HERO_RATE = 78;

const SCALE = [
    { heat: 'out' as const, name: 'Went out', note: 'Nothing logged. The day is a dead coal.' },
    { heat: 'cooling' as const, name: 'Barely lit', note: 'Under 40% kept. Still alight, only just.' },
    { heat: 'burning' as const, name: 'Burning', note: 'Most of the day kept. This is the normal good day.' },
    { heat: 'lit' as const, name: 'Fully lit', note: 'Everything kept. The coal holds a bright centre.' },
];

/* Three days from the same week, in order. The middle one is the point
   of the section, so it burns largest even though it is the failure. */
const RECOVERY = [
    { rate: 92, size: 118, label: 'Thursday', note: 'Four days in, everything kept.' },
    { rate: 0, size: 140, label: 'Friday', note: 'Nothing logged. The coal goes dark and stays dark.' },
    { rate: 67, size: 118, label: 'Saturday', note: 'You light it again. Nothing was taken away.' },
];

/* ── The fire that lights itself on arrival ───────────────────────────
   The page's one authored moment: the hearth climbing from cold states
   the whole thesis before a word is read. Under reduced motion it is
   simply already lit. */
function useIgnition(motionOK: boolean) {
    const [rate, setRate] = useState(motionOK ? 0 : HERO_RATE);

    useEffect(() => {
        if (!motionOK) return;
        const controls = animate(0, HERO_RATE, {
            duration: 1.9,
            delay: 0.25,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => setRate(Math.round(v)),
        });
        return () => controls.stop();
    }, [motionOK]);

    return rate;
}

/* ── Actions ──────────────────────────────────────────────────────────
   The outer wrapper stays put and owns the pointer handlers; only the
   inner span moves. Measuring an element that is itself being moved
   feeds its own offset back in and the button never settles.

   The wrapper's padding is cancelled by an equal negative margin, which
   widens the area that senses the cursor without changing the layout,
   so the pull begins just before you arrive. */
function Cta({
    to,
    href,
    children,
    variant = 'primary',
}: {
    to?: string;
    href?: string;
    children: ReactNode;
    variant?: 'primary' | 'secondary';
}) {
    const magnet = useMagnetic(variant === 'primary' ? 0.22 : 0.14);
    const bloom = useHeatSurface({ radius: 130, intensity: 0.55, rgb: '255, 238, 200' });

    const onMove = (e: ReactPointerEvent<HTMLElement>) => {
        magnet.onPointerMove(e);
        bloom.onPointerMove(e);
    };
    const onLeave = () => {
        magnet.onPointerLeave();
        bloom.onPointerLeave();
    };

    const inner = (
        <>
            <motion.span className="lp-cta-bloom" style={{ background: bloom.background }} aria-hidden />
            <span className="lp-cta-label">{children}</span>
        </>
    );

    const cls = `btn btn--${variant} lp-cta`;

    return (
        <span className="lp-cta-wrap" onPointerMove={onMove} onPointerLeave={onLeave}>
            <motion.span className="lp-cta-magnet" style={{ x: magnet.x, y: magnet.y }}>
                {to ? (
                    <Link to={to} className={cls}>{inner}</Link>
                ) : (
                    <a href={href} className={cls}>{inner}</a>
                )}
            </motion.span>
        </span>
    );
}

/* ── A cell that warms under the cursor ───────────────────────────────
   The heat rides on its own layer above the surface and below the text,
   so nothing the reader needs ever loses contrast. */
function HeatCell({
    className = '',
    variants,
    rgb,
    children,
}: {
    className?: string;
    variants?: Variants;
    rgb?: string;
    children: ReactNode;
}) {
    const heat = useHeatSurface({ radius: 300, intensity: 0.15, rgb });

    return (
        <motion.div
            className={`lp-cell ${className}`}
            variants={variants}
            onPointerMove={heat.onPointerMove}
            onPointerLeave={heat.onPointerLeave}
        >
            <motion.span className="lp-cell-heat" style={{ background: heat.background }} aria-hidden />
            {children}
        </motion.div>
    );
}

export default function Landing() {
    const motionOK = useMotionOK();
    const heroRate = useIgnition(motionOK);

    const days = useMemo(
        () => eachDayOfInterval({ start: startOfMonth(DEMO_MONTH), end: endOfMonth(DEMO_MONTH) }),
        [],
    );
    const leadingBlanks = days[0].getDay();

    /* Picking a coal re-lights the hearth beside it. This is the actual
       interaction from the dashboard, running on the marketing page. */
    const [selected, setSelected] = useState(17);
    const selectedRate = DEMO_RATES[selected] ?? 0;

    /* The nav veil is driven straight off a motion value, so scrolling
       costs no React renders and needs no scroll listener. */
    const { scrollY } = useScroll();
    const veil = useTransform(scrollY, [0, 60], [0, 1]);

    const tilt = useTilt(11);

    /* One halo for the whole month rather than a reaction per coal:
       thirty-one springs would cost thirty-one times as much and read
       exactly the same. It sits above the coals in plus-lighter, so it
       genuinely adds light to whatever it passes over. */
    const field = useHeatSurface({ radius: 190, intensity: 0.62, rgb: '255, 208, 130' });

    const rise = motionOK ? fadeRise : undefined;
    const stagger = motionOK ? staggerList : undefined;

    return (
        <div className="lp">
            {/* The month grid below is thirty-one real buttons. Without a
                way past them, reaching the page's own content by keyboard
                means tabbing through every day of January. */}
            <a href="#main" className="skip-link">Skip to content</a>

            {/* ── Navigation ─────────────────────────────────────────── */}
            <nav className="lp-nav">
                <motion.div className="lp-nav-veil" style={{ opacity: veil }} aria-hidden />
                <div className="lp-wrap lp-nav-inner">
                    <Link to="/" className="lp-mark">
                        <Flame size={19} strokeWidth={1.75} color="var(--gold)" />
                        Zenith Catalyst
                    </Link>

                    <div className="lp-nav-links">
                        <a href="#month" className="lp-nav-link">How it reads</a>
                        <a href="#features" className="lp-nav-link">Features</a>
                        <Link to="/login" className="lp-nav-link">Sign in</Link>
                        <Cta to="/register">Start your fire</Cta>
                    </div>
                </div>
            </nav>

            <main id="main">
            {/* ── Hero ───────────────────────────────────────────────── */}
            <header className="lp-wrap">
                <div className="lp-hero">
                    <motion.div
                        className="lp-hero-copy"
                        variants={stagger}
                        initial={motionOK ? 'hidden' : false}
                        animate="show"
                    >
                        <motion.h1 className="lp-hero-title" variants={rise}>
                            A habit is a fire. <em>Feed it daily.</em>
                        </motion.h1>

                        <motion.p className="lp-hero-sub" variants={rise}>
                            Every day you keep becomes a coal. One glance at the month tells you
                            whether the fire is holding.
                        </motion.p>

                        <motion.div className="lp-hero-actions" variants={rise}>
                            <Cta to="/register">
                                Start your fire
                                <ArrowRight size={15} strokeWidth={2} />
                            </Cta>
                            <Cta href="#month" variant="secondary">See how it reads</Cta>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="lp-hero-fire"
                        initial={motionOK ? { opacity: 0, scale: 0.9 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...springs.ember, delay: 0.1 }}
                        onPointerMove={tilt.onPointerMove}
                        onPointerLeave={tilt.onPointerLeave}
                    >
                        <EmberDrift />
                        <motion.div
                            className="lp-hero-tilt"
                            style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
                        >
                            <Hearth rate={heroRate} size={300} />
                        </motion.div>
                    </motion.div>
                </div>
            </header>

            {/* ── The month ──────────────────────────────────────────────
                The claim above, made checkable. These are the dashboard's
                own components; clicking a day works here exactly as it
                works inside the app. */}
            <section className="lp-section lp-section--sunk" id="month">
                <div className="lp-wrap">
                    <Reveal>
                        <h2 className="lp-lede">Read a month without reading a number.</h2>
                        <p className="lp-body">
                            Each day is a coal at its own temperature. A cold week is a dark patch
                            you can see from across the room, and a run that holds is a band of gold.
                            Pass your cursor over it, then pick any day to see what it was.
                        </p>
                    </Reveal>

                    <div className="lp-month-layout">
                        <div
                            className="lp-month-field"
                            onPointerMove={field.onPointerMove}
                            onPointerLeave={field.onPointerLeave}
                        >
                            <div className="lp-month-head" aria-hidden>
                                {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
                            </div>

                            <motion.div
                                className="lp-month"
                                role="group"
                                aria-label={`An example month, ${format(DEMO_MONTH, 'MMMM yyyy')}`}
                                variants={stagger}
                                initial={motionOK ? 'hidden' : false}
                                whileInView="show"
                                viewport={{ once: true, amount: 0.3 }}
                            >
                                {Array.from({ length: leadingBlanks }).map((_, i) => (
                                    <div key={`blank-${i}`} />
                                ))}
                                {days.map((day, i) => (
                                    <motion.div key={i} variants={rise}>
                                        <Coal
                                            day={day}
                                            rate={DEMO_RATES[i] ?? 0}
                                            isSelected={i === selected}
                                            isToday={false}
                                            onClick={() => setSelected(i)}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.span
                                className="lp-month-halo"
                                style={{ background: field.background }}
                                aria-hidden
                            />
                        </div>

                        <Reveal delay={0.1}>
                            <div className="t-center">
                                <Hearth rate={selectedRate} size={170} />
                                <p className="t-sm t-ash" style={{ marginTop: '0.75rem' }}>
                                    {format(days[selected], 'EEEE d MMMM')}
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── The scale ──────────────────────────────────────────────
                The one thing about this product a person has to learn, so
                it gets a section rather than a legend. */}
            <section className="lp-section">
                <div className="lp-wrap">
                    <Reveal>
                        <h2 className="lp-lede">Four temperatures, not a grade.</h2>
                        <p className="lp-body">
                            A missed day is not marked red and a kept one is not marked green,
                            because neither tells you anything you can act on. A day is either
                            keeping the fire or letting it cool. Red is kept for deleting things.
                        </p>
                    </Reveal>

                    <motion.div
                        className="lp-scale"
                        variants={stagger}
                        initial={motionOK ? 'hidden' : false}
                        whileInView="show"
                        viewport={{ once: true, amount: 0.4 }}
                    >
                        {SCALE.map((stop, i) => (
                            <motion.div key={stop.heat} className="lp-scale-stop" variants={rise}>
                                {i < SCALE.length - 1 && (
                                    <span
                                        className="lp-scale-seg"
                                        aria-hidden
                                        style={{
                                            background: `linear-gradient(90deg, ${HEAT_HEX[stop.heat]}, ${HEAT_HEX[SCALE[i + 1].heat]})`,
                                        }}
                                    />
                                )}
                                <div
                                    className="lp-scale-dot"
                                    style={{
                                        background: HEAT_HEX[stop.heat],
                                        boxShadow: stop.heat === 'lit'
                                            ? `0 0 14px ${HEAT_HEX[stop.heat]}bb`
                                            : stop.heat === 'burning'
                                                ? `0 0 8px ${HEAT_HEX[stop.heat]}77`
                                                : 'none',
                                    }}
                                />
                                <div className="lp-scale-name">{stop.name}</div>
                                <p className="lp-scale-note">{stop.note}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── The missed day ─────────────────────────────────────────
                The product's actual stance, and the reason the palette has
                no red in it. The failure burns largest because it is the
                thing the section is about. */}
            <section className="lp-section lp-section--sunk">
                <div className="lp-wrap">
                    <Reveal>
                        <h2 className="lp-lede">Miss a day. Nothing is taken away.</h2>
                        <p className="lp-body">
                            There is no counter to reset and no run to forfeit. A missed day is a
                            coal that stayed dark, sitting in the month next to the ones that did
                            not. The next day starts at whatever you give it.
                        </p>
                    </Reveal>

                    <motion.div
                        className="lp-recovery"
                        variants={stagger}
                        initial={motionOK ? 'hidden' : false}
                        whileInView="show"
                        viewport={{ once: true, amount: 0.35 }}
                    >
                        {RECOVERY.map((day) => (
                            <motion.div
                                key={day.label}
                                className={`lp-recovery-day ${day.rate === 0 ? 'lp-recovery-day--dark' : ''}`}
                                variants={rise}
                            >
                                <Hearth rate={day.rate} size={day.size} />
                                <div className="lp-recovery-name">{day.label}</div>
                                <p className="lp-recovery-note">{day.note}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── What is in it ──────────────────────────────────────── */}
            <section className="lp-section" id="features">
                <div className="lp-wrap">
                    <Reveal>
                        <h2 className="lp-lede">Everything is built around the fire.</h2>
                    </Reveal>

                    <motion.div
                        className="lp-bento"
                        variants={stagger}
                        initial={motionOK ? 'hidden' : false}
                        whileInView="show"
                        viewport={{ once: true, amount: 0.15 }}
                    >
                        <HeatCell className="lp-cell--wide" variants={rise}>
                            <Flame className="lp-cell-icon" size={22} strokeWidth={1.75} />
                            <h3>Daily habits</h3>
                            <p>
                                Check a habit and its coal warms as you do it. The day settles at
                                whatever you actually kept, and the month remembers.
                            </p>
                            <div className="lp-cell-coals" aria-hidden>
                                {[0, 2, 3, 4, 4, 3, 4, 4, 4, 2, 4, 4].map((h, i) => (
                                    <span
                                        key={i}
                                        className="lp-cell-coal"
                                        style={{
                                            background: `var(--heat-${h})`,
                                            boxShadow: h === 4 ? '0 0 8px rgba(242,181,68,0.55)' : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        </HeatCell>

                        <HeatCell variants={rise}>
                            <Layers className="lp-cell-icon" size={22} strokeWidth={1.75} />
                            <h3>Habits with parts</h3>
                            <p>
                                Break a habit into steps and tick them off separately. The parent
                                warms as its parts land.
                            </p>
                        </HeatCell>

                        <HeatCell className="lp-cell--heat" variants={rise}>
                            <Trophy className="lp-cell-icon" size={22} strokeWidth={1.75} />
                            <h3>Challenges</h3>
                            <p>Run a fixed stretch of days and watch the grid fill in.</p>
                            <div className="lp-cell-quest" aria-hidden>
                                {[4, 4, 3, 4, 4, 4, 2, 4, 4, 4, 3, 4, 0, 0].map((h, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            background: `var(--heat-${h})`,
                                            border: h === 0 ? '1px solid var(--line)' : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        </HeatCell>

                        <HeatCell variants={rise}>
                            <TrendingUp className="lp-cell-icon" size={22} strokeWidth={1.75} />
                            <h3>Analytics</h3>
                            <p>Completion over time, by habit and by week.</p>
                            <div className="lp-cell-bars" aria-hidden>
                                {[30, 52, 41, 68, 60, 84, 72, 95, 88].map((v, i) => (
                                    <span
                                        key={i}
                                        className="lp-cell-bar"
                                        style={{
                                            height: `${v}%`,
                                            background: `var(--heat-${v > 80 ? 4 : v > 55 ? 3 : 2})`,
                                            opacity: 0.85,
                                        }}
                                    />
                                ))}
                            </div>
                        </HeatCell>

                        {/* Cyan belongs to the machine everywhere else in this
                            product, so the coaching cell is the only one that
                            gets it, and its heat runs cyan to match. */}
                        <HeatCell className="lp-cell--ai" variants={rise} rgb="79, 195, 217">
                            <Sparkles className="lp-cell-icon" size={22} strokeWidth={1.75} />
                            <h3>Coaching</h3>
                            <p>
                                Ask why a habit keeps going out and get an answer based on your
                                own record.
                            </p>
                        </HeatCell>

                        <HeatCell className="lp-cell--wide" variants={rise}>
                            <Bell className="lp-cell-icon" size={22} strokeWidth={1.75} />
                            <h3>Reminders</h3>
                            <p>
                                Email nudges on your own schedule and in your own timezone. Pause
                                one when you need to, without deleting it.
                            </p>
                            <div className="lp-cell-sched" aria-hidden>
                                <span className="lp-sched"><span className="mono">08:00</span> Daily</span>
                                <span className="lp-sched"><span className="mono">08:00</span> Weekdays</span>
                                <span className="lp-sched"><span className="mono">21:00</span> Daily</span>
                            </div>
                        </HeatCell>

                        <HeatCell variants={rise}>
                            <Award className="lp-cell-icon" size={22} strokeWidth={1.75} />
                            <h3>Levels and streaks</h3>
                            <p>Kept days earn experience. Crossing a level is the one moment this app celebrates.</p>
                            <div className="lp-cell-xp" aria-hidden>
                                <span className="lp-xp-track"><span className="lp-xp-fill" /></span>
                            </div>
                        </HeatCell>
                    </motion.div>
                </div>
            </section>

            {/* ── Close ──────────────────────────────────────────────────
                The one centred moment on the page. The message is the whole
                design here, so it earns the centre. */}
            <section className="lp-section">
                <div className="lp-wrap lp-close">
                    <Reveal>
                        <Hearth rate={100} size={150} />
                    </Reveal>
                    <Reveal delay={0.08}>
                        <h2>It only asks what you fed it today.</h2>
                        <p>
                            No streak to protect and no score to defend. Light it once, then keep
                            it going.
                        </p>
                        <div className="lp-close-actions">
                            <Cta to="/register">
                                Start your fire
                                <ArrowRight size={15} strokeWidth={2} />
                            </Cta>
                        </div>
                    </Reveal>
                </div>
            </section>
            </main>

            <SiteFooter />
        </div>
    );
}
