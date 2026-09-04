import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { Check, CircleSlash, GripVertical, Star } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fetchHabitGrid, toggleHabit, reorderHabits } from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { errMsg } from '../lib/errors';
import { springs, staggerList, useMotionOK } from '../lib/motion';
import { iso } from './RangeControl';
import Counter from './Counter';
import { Skeleton, StatCardsSkeleton } from './Skeleton';
import { BlankLedger } from './Art';
import { useEffect, useRef, useState } from 'react';

/**
 * The ledger — every challenge against every day of the chosen window, laid
 * out as a grid you can read across (did this one hold?) or down (what kind
 * of day was that?). Analytics answers "how am I doing"; this answers "where
 * exactly did it go out", which no aggregate can.
 *
 * Marks are deliberately four-valued. A day before the challenge started, a
 * day still ahead, and today-so-far are all blank — but none of them are a
 * miss, and drawing them the same way would invent failures nobody had.
 */

/* Recharts paints into SVG outside our cascade, so it needs literal values. */
const AXIS = { fill: 'rgba(245,235,228,0.38)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' };
const GRID = 'rgba(245,235,228,0.07)';
const TOOLTIP = {
    background: '#221816',
    border: '1px solid rgba(245,235,228,0.18)',
    borderRadius: 10,
    fontFamily: 'Inter Tight, sans-serif',
    fontSize: 12,
};

type Mark = 'done' | 'missed' | 'open' | 'future' | 'off';

/* Rows only fade in. A y-offset variant would fight the transform Reorder
   puts on the same element to move it. */
const ROW_IN = { hidden: { opacity: 0 }, show: { opacity: 1 } };

/** How each mark reads, both to the eye and to a screen reader. */
const MARK_WORD: Record<Mark, string> = {
    done: 'completed',
    missed: 'missed',
    open: 'still open today',
    future: 'still ahead',
    off: 'not on the plan',
};

// ─── Stat tiles ─────────────────────────────────────────────────────
/** The completion figure gets a ring that fills to match it — the number and
    the picture are the same fact, so they can't drift apart. */
function Ring({ pct, color }: { pct: number; color: string }) {
    const motionOK = useMotionOK();
    const r = 17;
    const c = 2 * Math.PI * r;

    return (
        <svg width={46} height={46} viewBox="0 0 46 46" aria-hidden className="stat-ring">
            <circle cx="23" cy="23" r={r} fill="none" stroke="var(--heat-0)" strokeWidth={5} />
            <motion.circle
                cx="23" cy="23" r={r}
                fill="none"
                stroke={color}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={c}
                initial={motionOK ? { strokeDashoffset: c } : false}
                animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, pct))) / 100 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                transform="rotate(-90 23 23)"
            />
        </svg>
    );
}

function Disc({ icon, color, tint }: { icon: React.ReactNode; color: string; tint: string }) {
    return (
        <span className="stat-disc" style={{ color, background: tint, borderColor: tint }}>
            {icon}
        </span>
    );
}

function Tile({ mark, value, suffix = '', label, color }: {
    mark: React.ReactNode; value: number; suffix?: string; label: string; color: string;
}) {
    return (
        <div className="card card--sm stat stat--row">
            {mark}
            <span style={{ minWidth: 0 }}>
                <Counter value={value} suffix={suffix} className="tally stat-value" style={{ color }} />
                <span className="stat-label">{label}</span>
            </span>
        </div>
    );
}

// ─── One cell ───────────────────────────────────────────────────────
function Cell({ mark, date, title, onToggle, busy }: {
    mark: Mark;
    date: string;
    title: string;
    onToggle: () => void;
    busy: boolean;
}) {
    const motionOK = useMotionOK();
    const live = mark !== 'off' && mark !== 'future';

    return (
        <td className="ledger-cell">
            <motion.button
                type="button"
                className={`ledger-mark ledger-mark--${mark}`}
                disabled={!live || busy}
                onClick={live ? onToggle : undefined}
                aria-label={`${title} on ${format(parseISO(date), 'EEEE d MMMM')} — ${MARK_WORD[mark]}`}
                aria-pressed={mark === 'done'}
                animate={mark === 'done' && motionOK ? { scale: [1, 1.18, 1] } : undefined}
                transition={springs.strike}
                whileHover={live && motionOK ? { scale: 1.14 } : undefined}
                whileTap={live && motionOK ? { scale: 0.9 } : undefined}
            >
                <AnimatePresence initial={false}>
                    {mark === 'done' && (
                        <motion.span
                            key="tick"
                            initial={motionOK ? { scale: 0, rotate: -30 } : false}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={springs.strike}
                            style={{ display: 'flex' }}
                        >
                            <Check size={11} strokeWidth={3.5} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
        </td>
    );
}

/**
 * One draggable row. Only the grip drags — the row is full of buttons, and
 * every one of them would otherwise start a drag instead of marking a day.
 */
function LedgerRow({ habit, onDragEnd, children }: {
    habit: any;
    onDragEnd: () => void;
    children: (grab: (e: React.PointerEvent) => void) => React.ReactNode;
}) {
    const controls = useDragControls();
    const [held, setHeld] = useState(false);

    return (
        <Reorder.Item
            as="tr"
            value={habit}
            variants={ROW_IN}
            dragListener={false}
            dragControls={controls}
            data-dragging={held}
            onDragStart={() => setHeld(true)}
            onDragEnd={() => { setHeld(false); onDragEnd(); }}
            whileDrag={{ zIndex: 3, boxShadow: 'var(--shadow-lg)' }}
            transition={springs.settle}
        >
            {children((e) => controls.start(e))}
        </Reorder.Item>
    );
}

export default function ChallengeGrid({ from, to }: { from: string; to: string }) {
    const motionOK = useMotionOK();
    const qc = useQueryClient();
    const toast = useToast();
    const today = iso(new Date());

    const [pending, setPending] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['habit-grid', from, to],
        queryFn: () => fetchHabitGrid(from, to),
        staleTime: 60_000,
    });

    const toggleMut = useMutation({
        mutationFn: ({ habitId, date, completed }: { habitId: string; date: string; completed: boolean }) =>
            toggleHabit(habitId, date, completed),
        onSuccess: () => {
            // The stats, the curve and the row all read from the same query,
            // so one invalidation moves every one of them together.
            qc.invalidateQueries({ queryKey: ['habit-grid'] });
            qc.invalidateQueries({ queryKey: ['habits'] });
            qc.invalidateQueries({ queryKey: ['analytics'] });
            qc.invalidateQueries({ queryKey: ['profile'] });
        },
        onError: (e) => toast.error(errMsg(e, 'Could not save that day')),
        onSettled: () => setPending(null),
    });

    const dates: string[] = data?.dates ?? [];
    const habits: any[] = data?.habits ?? [];
    const summary = data?.summary ?? {};
    const timeline = data?.timeline ?? [];

    const rate = summary.overallRate ?? 0;
    // Past a couple of weeks the columns have to give up their month names or
    // the grid stops fitting anywhere sensible.
    const dense = dates.length > 16;

    /* ── Manual ordering ──────────────────────────────────────────────
       Rows are mirrored locally so a drag moves them at once, then written
       when it ends. The ledger only holds challenges, so the server splices
       this sequence into the slots they occupy in the full habit list. */
    const [rows, setRows] = useState<any[]>([]);
    const rowsRef = useRef<any[]>([]);
    const dragging = useRef(false);
    rowsRef.current = rows;

    const serverOrder = habits.map((h) => h.id).join();
    useEffect(() => {
        // Never let a background refetch yank the rows out from under a drag.
        if (!dragging.current) setRows(habits);
    }, [serverOrder]); // eslint-disable-line react-hooks/exhaustive-deps

    const reorderMut = useMutation({
        mutationFn: reorderHabits,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habit-grid'] });
            qc.invalidateQueries({ queryKey: ['habits'] });
        },
        onError: (e) => {
            toast.error(errMsg(e, 'Could not save the new order'));
            setRows(habits); // put it back the way the server has it
        },
    });

    const saveOrder = () => {
        dragging.current = false;
        reorderMut.mutate(rowsRef.current.map((h) => h.id));
    };

    // The grip is a real button, so the rows reorder from the keyboard too.
    const nudge = (habit: any, dir: -1 | 1) => {
        const at = rowsRef.current.findIndex((h) => h.id === habit.id);
        const to2 = at + dir;
        if (at < 0 || to2 < 0 || to2 >= rowsRef.current.length) return;
        const next = [...rowsRef.current];
        next.splice(to2, 0, next.splice(at, 1)[0]);
        setRows(next);
        reorderMut.mutate(next.map((h) => h.id));
    };

    const grabProps = (habit: any, grab: (e: React.PointerEvent) => void) => ({
        onPointerDown: (e: React.PointerEvent) => {
            dragging.current = true;
            // A press that never becomes a drag still has to release the
            // guard, or refetches stay blocked.
            window.addEventListener('pointerup', () => { dragging.current = false; }, { once: true });
            grab(e);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            nudge(habit, e.key === 'ArrowUp' ? -1 : 1);
        },
    });

    const flip = (habit: any, date: string, mark: Mark) => {
        setPending(`${habit.id}:${date}`);
        toggleMut.mutate({ habitId: habit.id, date, completed: mark !== 'done' });
    };

    const subLine = (h: any) => {
        if (h.description) return h.description;
        if (!h.endDate) return h.category;
        const left = differenceInCalendarDays(parseISO(h.endDate), parseISO(today));
        return left < 0 ? 'Finished' : left === 0 ? 'Last day' : `${left} days left`;
    };

    return (
        <div>
            <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
                {isLoading ? (
                    <StatCardsSkeleton count={4} />
                ) : (
                    <>
                        <Tile
                            mark={<Ring pct={rate} color={rate >= 80 ? 'var(--gold)' : rate >= 40 ? 'var(--copper)' : 'var(--cold)'} />}
                            value={rate}
                            suffix="%"
                            label="Overall completion"
                            color="var(--ink)"
                        />
                        <Tile
                            mark={<Disc icon={<Check size={20} strokeWidth={3} />} color="var(--gold)" tint="rgba(242, 181, 68, 0.14)" />}
                            value={summary.completed ?? 0}
                            label="Completed"
                            color="var(--ink)"
                        />
                        <Tile
                            mark={<Disc icon={<CircleSlash size={20} />} color="var(--cold)" tint="rgba(90, 107, 120, 0.16)" />}
                            value={summary.missed ?? 0}
                            label="Missed"
                            color="var(--ink)"
                        />
                        <Tile
                            mark={<Disc icon={<Star size={20} fill="currentColor" />} color="var(--copper-lit)" tint="rgba(201, 123, 78, 0.16)" />}
                            value={summary.currentStreak ?? 0}
                            label="Current streak"
                            color="var(--ink)"
                        />
                    </>
                )}
            </div>

            <div className="card card--static" style={{ marginBottom: '1.25rem' }}>
                {isLoading ? (
                    <Skeleton height={200} radius={12} />
                ) : timeline.every((t: any) => t.total === 0) ? (
                    <div className="ledger-empty">
                        <BlankLedger size={84} />
                        <span>No challenge was running in these days.</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                            <defs>
                                {/* The fill fades out downward so the area reads as heat rising. */}
                                <linearGradient id="ledger-heat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f2b544" stopOpacity={0.34} />
                                    <stop offset="100%" stopColor="#8f5334" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="ledger-line" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor="#8f5334" />
                                    <stop offset="55%" stopColor="#c97b4e" />
                                    <stop offset="100%" stopColor="#f2b544" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke={GRID} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(v) => format(parseISO(v), 'd MMM')}
                                tick={AXIS}
                                stroke={GRID}
                                interval="preserveStartEnd"
                                minTickGap={18}
                            />
                            <YAxis domain={[0, 100]} unit="%" tick={AXIS} stroke={GRID} />
                            <Tooltip
                                contentStyle={TOOLTIP}
                                cursor={{ stroke: '#c97b4e', strokeWidth: 1, strokeDasharray: '3 3' }}
                                labelFormatter={(v) => format(parseISO(String(v)), 'EEEE d MMM')}
                                formatter={(v: any, _n, item: any) => [
                                    `${v}% — ${item?.payload?.completed}/${item?.payload?.total} completed`,
                                    'That day',
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey="completionRate"
                                stroke="url(#ledger-line)"
                                strokeWidth={2.5}
                                fill="url(#ledger-heat)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#f2b544', stroke: '#16100f', strokeWidth: 2 }}
                                isAnimationActive={motionOK}
                                animationDuration={800}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="card card--static">
                {isLoading ? (
                    <div className="stack">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={44} radius={10} />)}
                    </div>
                ) : habits.length === 0 ? (
                    <div className="ledger-empty">
                        <BlankLedger size={96} />
                        <span>No challenge ran in this window. Step back a page, or flag a habit as a challenge.</span>
                    </div>
                ) : (
                    <>
                        <div className="ledger-scroll">
                            <table className="ledger" data-dense={dense}>
                                <thead>
                                    <tr>
                                        <th className="ledger-name ledger-name--head">Daily habits</th>
                                        {dates.map((d, i) => {
                                            const day = parseISO(d);
                                            // A dense grid keeps the month only where it changes,
                                            // so you can still tell where you are.
                                            const showMonth = !dense || i === 0 || day.getDate() === 1;
                                            return (
                                                <th key={d} className="ledger-day" data-today={d === today}>
                                                    <span className="ledger-day-date">
                                                        {format(day, showMonth ? 'd MMM' : 'd')}
                                                    </span>
                                                    <span className="ledger-day-name">
                                                        {format(day, dense ? 'EEEEE' : 'EEE')}
                                                    </span>
                                                </th>
                                            );
                                        })}
                                        <th className="ledger-progress ledger-progress--head">Progress</th>
                                    </tr>
                                </thead>

                                <Reorder.Group
                                    as="tbody"
                                    axis="y"
                                    values={rows}
                                    onReorder={setRows}
                                    variants={motionOK ? staggerList : undefined}
                                    initial={motionOK ? 'hidden' : false}
                                    animate="show"
                                >
                                    {rows.map((h) => (
                                        <LedgerRow key={h.id} habit={h} onDragEnd={saveOrder}>
                                            {(grab) => (
                                                <>
                                                    <th scope="row" className="ledger-name">
                                                        <span className="ledger-name-inner">
                                                            <button
                                                                type="button"
                                                                className="grip"
                                                                {...grabProps(h, grab)}
                                                                aria-label={`Reorder ${h.title}. Use the arrow keys to move it.`}
                                                                title="Drag to reorder"
                                                            >
                                                                <GripVertical size={14} />
                                                            </button>
                                                            <span className="rule" style={{ background: h.color || 'var(--copper)' }} />
                                                            <span style={{ minWidth: 0 }}>
                                                                <span className="ledger-title truncate">{h.title}</span>
                                                                <span className="ledger-sub truncate">{subLine(h)}</span>
                                                            </span>
                                                        </span>
                                                    </th>

                                                    {dates.map((d, i) => (
                                                        <Cell
                                                            key={d}
                                                            date={d}
                                                            title={h.title}
                                                            mark={h.marks[i] as Mark}
                                                            busy={pending === `${h.id}:${d}`}
                                                            onToggle={() => flip(h, d, h.marks[i] as Mark)}
                                                        />
                                                    ))}

                                                    <td className="ledger-progress">
                                                        <span className="ledger-pct mono">{h.completionRate}%</span>
                                                        <span className="progress-track">
                                                            <motion.span
                                                                className="progress-fill"
                                                                style={{ display: 'block' }}
                                                                initial={motionOK ? { width: 0 } : false}
                                                                animate={{ width: `${h.completionRate}%` }}
                                                                transition={springs.ember}
                                                            />
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </LedgerRow>
                                    ))}
                                </Reorder.Group>
                            </table>
                        </div>

                        <div className="ledger-legend">
                            <span><i className="ledger-key ledger-key--done" /> Completed</span>
                            <span><i className="ledger-key ledger-key--missed" /> Missed</span>
                            <span><i className="ledger-key ledger-key--open" /> Today, still open</span>
                            <span><i className="ledger-key ledger-key--off" /> Not on the plan</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
