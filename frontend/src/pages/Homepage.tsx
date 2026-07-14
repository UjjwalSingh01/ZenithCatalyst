import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { fetchHabitsForDate, fetchAnalytics, toggleHabit, toggleSubHabit, fetchMotivationalQuote } from '../lib/queries';
import { DayHabitListSkeleton } from '../components/Skeleton';
import { fadeRise, staggerList, springs, heatOf, HEAT_LABEL, useMotionOK } from '../lib/motion';
import Hearth from '../components/Hearth';
import Coal from '../components/Coal';
import HabitCheck from '../components/HabitCheck';
import { ColdHearth } from '../components/Art';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Homepage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const motionOK = useMotionOK();
    const qc = useQueryClient();

    const { data: dayHabits = [], isLoading: dayLoading } = useQuery({
        queryKey: ['habits-day', selectedDateStr],
        queryFn: () => fetchHabitsForDate(selectedDateStr),
    });

    const { data: analytics } = useQuery({
        queryKey: ['analytics', 'month'],
        queryFn: () => fetchAnalytics('month'),
        staleTime: 5 * 60_000,
    });

    const { data: quote } = useQuery({
        queryKey: ['motivational-quote'],
        queryFn: fetchMotivationalQuote,
        staleTime: 24 * 60 * 60_000,
    });

    const toggleMut = useMutation({
        mutationFn: ({ habitId, completed }: { habitId: string; completed: boolean }) =>
            toggleHabit(habitId, selectedDateStr, completed),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits-day', selectedDateStr] });
            qc.invalidateQueries({ queryKey: ['analytics'] });
            qc.invalidateQueries({ queryKey: ['profile'] });
        },
    });

    const subToggleMut = useMutation({
        mutationFn: ({ subId, completed }: { subId: string; completed: boolean }) =>
            toggleSubHabit(subId, selectedDateStr, completed),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['habits-day', selectedDateStr] }),
    });

    const calendarDays = useMemo(
        () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }),
        [currentMonth],
    );

    const rateByDate = useMemo(() => {
        const map = new Map<string, number>();
        analytics?.timeline?.forEach((t: any) => map.set(t.date, t.completionRate));
        return map;
    }, [analytics]);

    const done = dayHabits.filter((h: any) => h.completed).length;
    const dayRate = dayHabits.length > 0 ? Math.round((done / dayHabits.length) * 100) : 0;
    const heat = heatOf(dayRate);
    const leadingBlanks = calendarDays[0].getDay();

    const shiftMonth = (by: number) =>
        setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <div className="eyebrow">{format(new Date(), 'EEEE · d MMMM yyyy')}</div>
                    <h1>Keep the fire</h1>
                </div>
                {quote && (
                    <div className="card card--sm card--ai card--static" style={{ maxWidth: 360 }}>
                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--ink)' }}>“{quote.quote}”</p>
                        <p className="mono t-cyan" style={{ fontSize: '0.7rem', marginTop: '0.35rem' }}>— {quote.author}</p>
                    </div>
                )}
            </div>

            <div className="grid-2">
                {/* ── The month, as a field of coals ─────────────────────── */}
                <div className="card card--static">
                    <div className="row row--between" style={{ marginBottom: '1rem' }}>
                        <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
                        <div className="row" style={{ gap: '0.35rem' }}>
                            <button className="btn btn--secondary btn--sm btn--icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                                <ChevronLeft size={16} />
                            </button>
                            <button className="btn btn--secondary btn--sm btn--icon" onClick={() => shiftMonth(1)} aria-label="Next month">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: '0.35rem' }}>
                        {WEEKDAYS.map((d, i) => (
                            <div key={i} className="mono t-ash" style={{ textAlign: 'center', fontSize: '0.6rem', padding: '0.25rem 0' }}>
                                {d}
                            </div>
                        ))}
                    </div>

                    <motion.div
                        key={format(currentMonth, 'yyyy-MM')}
                        variants={motionOK ? staggerList : undefined}
                        initial={motionOK ? 'hidden' : false}
                        animate="show"
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}
                    >
                        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
                        {calendarDays.map((day) => {
                            const ds = format(day, 'yyyy-MM-dd');
                            return (
                                <motion.div key={ds} variants={motionOK ? fadeRise : undefined}>
                                    <Coal
                                        day={day}
                                        rate={rateByDate.get(ds) ?? 0}
                                        isSelected={isSameDay(day, selectedDate)}
                                        isToday={isToday(day)}
                                        onClick={() => setSelectedDate(day)}
                                    />
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* Legend explains the temperature scale, which is the one
                        thing about this calendar a person has to learn. */}
                    <div className="row row--wrap" style={{ gap: '0.85rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--line)' }}>
                        {(['out', 'cooling', 'burning', 'lit'] as const).map((h) => (
                            <span key={h} className="row" style={{ gap: '0.35rem' }}>
                                <span
                                    style={{
                                        width: 9, height: 9, borderRadius: '50%',
                                        background: `var(--heat-${{ out: 0, cooling: 2, burning: 3, lit: 4 }[h]})`,
                                    }}
                                />
                                <span className="mono t-ash" style={{ fontSize: '0.62rem' }}>{HEAT_LABEL[h]}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── The selected day ───────────────────────────────────── */}
                <div className="stack stack--lg">
                    <div className="card card--static">
                        <div className="row" style={{ gap: '1.25rem' }}>
                            <Hearth rate={dayRate} />
                            <div>
                                <h3 style={{ marginBottom: '0.2rem' }}>{format(selectedDate, 'EEEE, d MMM')}</h3>
                                <p className="t-sm" style={{ marginBottom: '0.6rem' }}>
                                    {dayHabits.length === 0
                                        ? 'Nothing scheduled'
                                        : `${done} of ${dayHabits.length} habit${dayHabits.length === 1 ? '' : 's'} done`}
                                </p>
                                {dayHabits.length > 0 && (
                                    <span className={`badge badge--${heat === 'out' ? 'cold' : heat === 'lit' ? 'lit' : 'burning'}`}>
                                        <Flame size={11} /> {HEAT_LABEL[heat]}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="stack" style={{ maxHeight: 460, overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {dayLoading ? (
                            <DayHabitListSkeleton count={3} />
                        ) : dayHabits.length === 0 ? (
                            <div className="card empty card--static">
                                <span className="empty-art"><ColdHearth /></span>
                                <h3>Nothing to keep alight</h3>
                                <p>No habits are scheduled for this day.</p>
                                <Link to="/app/habits" className="btn btn--primary">Add a habit</Link>
                            </div>
                        ) : (
                            <motion.div
                                className="stack"
                                variants={motionOK ? staggerList : undefined}
                                initial={motionOK ? 'hidden' : false}
                                animate="show"
                            >
                                <AnimatePresence mode="popLayout">
                                    {dayHabits.map((habit: any) => {
                                        const subs = habit.subHabits ?? [];
                                        const subsDone = subs.filter((s: any) => s.completed).length;
                                        return (
                                            <motion.div
                                                key={habit.id}
                                                layout
                                                variants={motionOK ? fadeRise : undefined}
                                                exit={{ opacity: 0, scale: 0.97 }}
                                                transition={springs.settle}
                                                className={`card card--sm ${habit.completed ? 'card--lit' : ''}`}
                                            >
                                                <div className="row row--top">
                                                    <span
                                                        className="rule"
                                                        style={{
                                                            background: habit.completed ? 'var(--gold)' : habit.color || 'var(--copper-deep)',
                                                            boxShadow: habit.completed ? '0 0 8px rgba(242,181,68,0.6)' : 'none',
                                                            transition: 'background 0.3s ease, box-shadow 0.3s ease',
                                                        }}
                                                    />
                                                    {subs.length === 0 && (
                                                        <HabitCheck
                                                            checked={habit.completed}
                                                            label={habit.title}
                                                            onChange={(next) => toggleMut.mutate({ habitId: habit.id, completed: next })}
                                                        />
                                                    )}
                                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                                        <div
                                                            className="t-semi"
                                                            style={{
                                                                fontSize: '0.92rem',
                                                                color: habit.completed ? 'var(--gold)' : 'var(--ink)',
                                                                transition: 'color 0.3s ease',
                                                            }}
                                                        >
                                                            {habit.title}
                                                        </div>
                                                        {habit.category && <span className="mono t-ash" style={{ fontSize: '0.65rem' }}>{habit.category}</span>}
                                                    </div>
                                                    {subs.length > 0 && (
                                                        <span className="mono t-dim" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                                                            {subsDone}/{subs.length}
                                                        </span>
                                                    )}
                                                </div>

                                                {subs.length > 0 && (
                                                    <div className="stack" style={{ gap: '0.45rem', marginTop: '0.75rem', paddingLeft: '1.1rem' }}>
                                                        {subs.map((sub: any) => (
                                                            <div key={sub.id} className="row" style={{ gap: '0.55rem' }}>
                                                                <HabitCheck
                                                                    size="sm"
                                                                    checked={sub.completed}
                                                                    label={sub.content}
                                                                    onChange={(next) => subToggleMut.mutate({ subId: sub.id, completed: next })}
                                                                />
                                                                <span
                                                                    className="t-sm"
                                                                    style={{
                                                                        color: sub.completed ? 'var(--gold)' : 'var(--ink-dim)',
                                                                        transition: 'color 0.3s ease',
                                                                    }}
                                                                >
                                                                    {sub.content}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
