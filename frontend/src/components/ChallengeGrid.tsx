import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { Check, CircleSlash, GripVertical, Star } from 'lucide-react';
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fetchHabitGrid, toggleHabit, reorderHabits, setHabitDayNote } from '../lib/queries';
import DayNote from './DayNote';
import { useToast } from '../contexts/ToastContext';
import { errMsg } from '../lib/errors';
import { springs, useMotionOK } from '../lib/motion';
import { invalidateHabitData, invalidateHabitShape } from '../lib/invalidate';
import { iso } from './RangeControl';
import Counter from './Counter';
import { Skeleton, StatCardsSkeleton } from './Skeleton';
import { BlankLedger } from './Art';
import { useEffect, useMemo, useRef, useState } from 'react';

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
/* The pace line is chrome, not a competing series, so it wears the axis ink
   rather than a heat colour. Giving it one of the temperatures would claim the
   days you did not keep were themselves warm. */
const PACE = 'rgba(245,235,228,0.34)';
const TOOLTIP = {
    background: '#221816',
    border: '1px solid rgba(245,235,228,0.18)',
    borderRadius: 10,
    fontFamily: 'Inter Tight, sans-serif',
    fontSize: 12,
};

type Mark = 'done' | 'missed' | 'open' | 'future' | 'off';

/* Rows only fade in. A y-offset would fight the transform Reorder puts on the
   same element to move it.

   Each row drives its own entrance rather than inheriting a variant from the
   group. The rows arrive a tick after the group does — `rows` starts empty and
   is filled once the query resolves — so by the time they mount, the group's
   own enter animation has already finished. A child that mounts late inherits
   the resolved label, which was `hidden`, and stays at zero opacity: present in
   the DOM, laid out, and completely invisible. That is the blank grid.

   The stagger is a per-row delay for the same reason: `staggerChildren` only
   works through the propagation this deliberately avoids. Capped so a long
   ledger does not make the last row wait. */
const rowEnter = (index: number) => ({
    duration: 0.22,
    ease: [0.16, 1, 0.3, 1] as const,
    delay: Math.min(index, 14) * 0.03,
});

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
function Cell({ mark, date, title, note, onToggle, onNote, busy }: {
    mark: Mark;
    date: string;
    title: string;
    note: string | null;
    onToggle: () => void;
    onNote: (anchor: HTMLElement) => void;
    busy: boolean;
}) {
    const motionOK = useMotionOK();
    const live = mark !== 'off' && mark !== 'future';
    const wrap = useRef<HTMLSpanElement>(null);

    const label = [
        `${title} on ${format(parseISO(date), 'EEEE d MMMM')} — ${MARK_WORD[mark]}`,
        note ? `Note: ${note}` : null,
        live ? 'Press N to write a note for this day.' : null,
    ].filter(Boolean).join('. ');

    return (
        <td className="ledger-cell">
            <span className="ledger-cell-wrap" ref={wrap}>
                <motion.button
                    type="button"
                    className={`ledger-mark ledger-mark--${mark}`}
                    disabled={!live || busy}
                    onClick={live ? onToggle : undefined}
                    /* The note lives behind a key rather than a second tab
                       stop. This grid is habits × days, so one extra focusable
                       control per cell would more than double the tab order
                       for everyone, to reach a field most days never use. */
                    onKeyDown={(e) => {
                        if (!live || (e.key !== 'n' && e.key !== 'N')) return;
                        e.preventDefault();
                        if (wrap.current) onNote(wrap.current);
                    }}
                    aria-label={label}
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

                {/* Pointer-only twin of the N key. Hidden from assistive tech
                    and out of the tab order so the cell announces once, as one
                    control, with the shortcut in its label. */}
                {live && (
                    <button
                        type="button"
                        className="ledger-note"
                        data-has={note ? 'true' : 'false'}
                        tabIndex={-1}
                        aria-hidden
                        title={note ? note : 'Add a note for this day'}
                        onClick={() => wrap.current && onNote(wrap.current)}
                    />
                )}
            </span>
        </td>
    );
}

/**
 * One draggable row. Only the grip drags — the row is full of buttons, and
 * every one of them would otherwise start a drag instead of marking a day.
 */
function LedgerRow({ habit, index, motionOK, onDragEnd, children }: {
    habit: any;
    index: number;
    motionOK: boolean;
    onDragEnd: () => void;
    children: (grab: (e: React.PointerEvent) => void) => React.ReactNode;
}) {
    const controls = useDragControls();
    const [held, setHeld] = useState(false);

    return (
        <Reorder.Item
            as="tr"
            value={habit}
            initial={motionOK ? { opacity: 0 } : false}
            animate={{ opacity: 1, transition: rowEnter(index) }}
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
        // The stats, the curve and the row all read from the same query, so
        // this moves every one of them together, and Today and the charts
        // with them.
        onSuccess: () => invalidateHabitData(qc),
        onError: (e) => toast.error(errMsg(e, 'Could not save that day')),
        onSettled: () => setPending(null),
    });

    /* ── Day notes ────────────────────────────────────────────────────
       One popover for the whole grid, re-anchored to whichever cell asked
       for it. Mounting an editor per cell would build a hundred of them to
       use one. */
    const [noteAt, setNoteAt] = useState<
        { habitId: string; title: string; date: string; note: string | null } | null
    >(null);
    const noteAnchor = useRef<HTMLElement | null>(null);

    const noteMut = useMutation({
        mutationFn: ({ habitId, date, note }: { habitId: string; date: string; note: string }) =>
            setHabitDayNote(habitId, date, note),
        onSuccess: (_d, vars) => {
            // Only the ledger carries notes, so nothing else needs waking.
            qc.invalidateQueries({ queryKey: ['habit-grid'] });
            toast.success(vars.note.trim() ? 'Note saved' : 'Note removed');
            setNoteAt(null);
        },
        onError: (e) => toast.error(errMsg(e, 'Could not save that note')),
    });

    const openNote = (habit: any, date: string, i: number, anchor: HTMLElement) => {
        noteAnchor.current = anchor;
        setNoteAt({
            habitId: habit.id,
            title: habit.title,
            date,
            note: habit.notes?.[i] ?? null,
        });
    };

    const dates: string[] = data?.dates ?? [];
    const habits: any[] = data?.habits ?? [];
    const summary = data?.summary ?? {};
    const timeline = data?.timeline ?? [];

    /* ── The trajectory ───────────────────────────────────────────────
       The chart used to plot each day's completion rate, which swung
       between 100% and 0% and read as noise: a challenge kept four days
       out of five looked like a heart monitor. It also said nothing the
       ledger below does not already say per day, and said it worse.

       A challenge is a thing you are getting through, so the question is
       "how far along am I, and how far behind?" — which is cumulative.
       Both series are counted in days on one scale, because two y-axes
       would invent a relationship between them. */
    const progress = useMemo(() => {
        let kept = 0;
        let offered = 0;
        return timeline.map((t: any) => {
            kept += t.completed;
            offered += t.total;
            return {
                date: t.date,
                kept,
                offered,
                short: offered - kept,
                dayRate: t.completionRate,
                dayCompleted: t.completed,
                dayTotal: t.total,
            };
        });
    }, [timeline]);

    const last = progress[progress.length - 1];

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
        onSuccess: () => invalidateHabitShape(qc),
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
                    <>
                        {/* The one direct label on the chart. A value beside
                            every point would be unreadable, so the standing
                            total is stated once, here, and the axis and the
                            tooltip carry the rest. */}
                        <div className="chart-head">
                            <div>
                                <h3 className="chart-title">Days kept</h3>
                                <p className="chart-sub">
                                    Every day each challenge was due, and whether you kept it.
                                </p>
                            </div>
                            {last && (
                                /* "of 60 days" would read as sixty calendar
                                   days; it is four challenges across fifteen.
                                   Saying "due" matches the legend key. */
                                <p className="chart-standing">
                                    <span className="tally">{last.kept}</span>
                                    <span className="chart-standing-of">of {last.offered} due</span>
                                </p>
                            )}
                        </div>

                        {/* A legend, because there are two series and identity
                            must never rest on colour alone. The marks differ in
                            fill and dash as well as hue. */}
                        <div className="chart-legend">
                            <span><i className="chart-key chart-key--kept" /> Kept</span>
                            <span><i className="chart-key chart-key--pace" /> Days due</span>
                        </div>

                        <ResponsiveContainer width="100%" height={230}>
                            {/* Margins are set by the widest label on each
                                side. Right is half of "6 Sep". Left is zero,
                                not negative: this axis counts days, and with
                                enough challenges running it reaches three
                                digits — pulling the plot left clipped the
                                leading digit, so 180 rendered as ".80". The
                                old chart could afford the negative inset
                                because it was a fixed 0-100 percentage. */}
                            <ComposedChart data={progress} margin={{ top: 8, right: 26, left: 0, bottom: 0 }}>
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

                                {/* Solid hairlines. A dashed grid reads as a
                                    threshold when it is only a grid, and the
                                    one dashed thing here should be the pace. */}
                                <CartesianGrid stroke={GRID} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(v) => format(parseISO(v), 'd MMM')}
                                    tick={AXIS}
                                    stroke={GRID}
                                    interval="preserveStartEnd"
                                    minTickGap={18}
                                />
                                {/* Days, so whole numbers only. Width fits a
                                    four-digit tick, which is more challenge-
                                    days than a window can hold. */}
                                <YAxis allowDecimals={false} tick={AXIS} stroke={GRID} width={40} />
                                <Tooltip
                                    contentStyle={TOOLTIP}
                                    cursor={{ stroke: '#c97b4e', strokeWidth: 1 }}
                                    labelFormatter={(v) => format(parseISO(String(v)), 'EEEE d MMM')}
                                    /* Rows are named for the series they came
                                       from, matching the legend. Both saying
                                       "by this day" told you nothing about
                                       which line you were reading. */
                                    formatter={(v: any, _n, item: any) => {
                                        const p = item?.payload;
                                        if (_n === 'offered') {
                                            return [`${v} so far · ${p?.short} not kept`, 'Days due'];
                                        }
                                        return [`${v} so far · ${p?.dayCompleted}/${p?.dayTotal} that day`, 'Kept'];
                                    }}
                                />

                                {/* Everything that was due. The gap above the
                                    filled area is the shortfall, which is the
                                    fact the old chart never showed. */}
                                <Line
                                    type="monotone"
                                    dataKey="offered"
                                    stroke={PACE}
                                    strokeWidth={2}
                                    strokeDasharray="5 4"
                                    dot={false}
                                    activeDot={{ r: 4, fill: PACE, stroke: '#16100f', strokeWidth: 2 }}
                                    isAnimationActive={motionOK}
                                    animationDuration={800}
                                />

                                <Area
                                    type="monotone"
                                    dataKey="kept"
                                    stroke="url(#ledger-line)"
                                    strokeWidth={2.5}
                                    fill="url(#ledger-heat)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#f2b544', stroke: '#16100f', strokeWidth: 2 }}
                                    isAnimationActive={motionOK}
                                    animationDuration={800}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </>
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

                                {/* No variants on the group: the rows time
                                    their own entrance, so nothing here has to
                                    still be animating when they arrive. */}
                                <Reorder.Group
                                    as="tbody"
                                    axis="y"
                                    values={rows}
                                    onReorder={setRows}
                                >
                                    {rows.map((h, rowIndex) => (
                                        <LedgerRow
                                            key={h.id}
                                            habit={h}
                                            index={rowIndex}
                                            motionOK={motionOK}
                                            onDragEnd={saveOrder}
                                        >
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
                                                            note={h.notes?.[i] ?? null}
                                                            busy={pending === `${h.id}:${d}`}
                                                            onToggle={() => flip(h, d, h.marks[i] as Mark)}
                                                            onNote={(anchor) => openNote(h, d, i, anchor)}
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
                            <span><i className="ledger-key ledger-key--note" /> Has a note</span>
                        </div>

                        {/* The one hint the grid cannot show by drawing it. */}
                        <p className="ledger-hint">
                            A challenge is rarely the same task twice. Hover any day to note what it
                            took, or focus it and press <kbd>N</kbd>.
                        </p>
                    </>
                )}
            </div>

            <DayNote
                open={noteAt !== null}
                onClose={() => setNoteAt(null)}
                anchorRef={noteAnchor}
                habitTitle={noteAt?.title ?? ''}
                date={noteAt?.date ?? today}
                note={noteAt?.note ?? null}
                saving={noteMut.isPending}
                onSave={(next) =>
                    noteAt && noteMut.mutate({ habitId: noteAt.habitId, date: noteAt.date, note: next })
                }
            />
        </div>
    );
}
