import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { fetchHabitsForDate, fetchAnalytics, toggleHabit, toggleSubHabit, fetchMotivationalQuote } from '../lib/queries';
import { DayHabitListSkeleton } from '../components/Skeleton';

// ─── Water Fill Progress Circle ──────────────────────────────────
function WaterFill({ progress, size = 80, color = '#6366f1' }: { progress: number; size?: number; color?: string }) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="transparent" />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke={color} strokeWidth={6} fill="transparent"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color}60)` }}
            />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
                fill="white" fontSize={size * 0.2} fontWeight="bold" fontFamily="Outfit, sans-serif">
                {Math.round(progress)}%
            </text>
        </svg>
    );
}

// ─── Calendar Cell ───────────────────────────────────────────────
function CalendarDay({ day, rate, isSelected, isCurrentDay, onClick }: {
    day: Date; rate: number; isSelected: boolean; isCurrentDay: boolean; onClick: () => void
}) {
    const color = rate >= 80 ? '#22c55e' : rate >= 40 ? '#f59e0b' : rate > 0 ? '#ef4444' : 'transparent';
    const bgOpacity = rate > 0 ? 0.15 : 0;
    return (
        <button onClick={onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0.5rem 0.25rem', borderRadius: 10, cursor: 'pointer', gap: 4,
            background: isSelected ? 'rgba(99,102,241,0.2)' : rate > 0 ? `${color}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
            border: isSelected ? '1px solid var(--brand-500)' : isCurrentDay ? '1px solid var(--brand-400)' : '1px solid transparent',
            transition: 'all 0.2s', minWidth: 0,
        }}>
            <span style={{ fontSize: '0.7rem', color: isCurrentDay ? 'var(--brand-400)' : 'var(--text-muted)', fontWeight: isCurrentDay ? 700 : 400 }}>
                {format(day, 'd')}
            </span>
            {rate > 0 && (
                <div style={{ width: 20, height: 20, position: 'relative', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${rate}%`, background: color, opacity: 0.8, transition: 'height 0.4s ease' }} />
                </div>
            )}
        </button>
    );
}

export default function Homepage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
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

    const calendarDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);

    // Build completion rate map from analytics
    const rateByDate = useMemo(() => {
        const map = new Map<string, number>();
        analytics?.timeline?.forEach((t: any) => map.set(t.date, t.completionRate));
        return map;
    }, [analytics]);

    const dayOverall = dayHabits.length > 0
        ? Math.round((dayHabits.filter((h: any) => h.completed).length / dayHabits.length) * 100)
        : 0;

    const firstDayOfMonth = calendarDays[0].getDay();

    return (
        <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Today's Dashboard</h1>
                    <p className="text-secondary">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                {quote && (
                    <div className="card card-glass" style={{ maxWidth: 380, padding: '1rem' }}>
                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '0.25rem' }}>"{quote.quote}"</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--brand-400)', fontWeight: 600 }}>— {quote.author}</p>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Calendar */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>◁</button>
                            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>▷</button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: '0.5rem' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0.25rem 0' }}>{d}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                        {calendarDays.map((day) => {
                            const ds = format(day, 'yyyy-MM-dd');
                            return (
                                <CalendarDay key={ds} day={day} rate={rateByDate.get(ds) ?? 0}
                                    isSelected={isSameDay(day, selectedDate)} isCurrentDay={isToday(day)}
                                    onClick={() => setSelectedDate(day)} />
                            );
                        })}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {[['🟢', 'Great (80%+)'], ['🟡', 'Ok (40-79%)'], ['🔴', 'Poor (<40%)']].map(([dot, label]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                <span>{dot}</span><span>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day Detail Panel */}
                <div>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <WaterFill progress={dayOverall} color={dayOverall >= 80 ? '#22c55e' : dayOverall >= 40 ? '#f59e0b' : '#ef4444'} />
                            <div>
                                <h3 style={{ marginBottom: '0.15rem' }}>{format(selectedDate, 'EEEE, MMM d')}</h3>
                                <p style={{ fontSize: '0.875rem' }}>{dayHabits.filter((h: any) => h.completed).length} / {dayHabits.length} habits completed</p>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {dayOverall >= 80 && <span className="badge badge-success">🔥 Amazing day!</span>}
                                    {dayOverall >= 40 && dayOverall < 80 && <span className="badge badge-warning">⬆ Keep going</span>}
                                    {dayOverall < 40 && dayHabits.length > 0 && <span className="badge badge-error">💪 You can do it</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Habits List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 450, overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {dayLoading ? (
                            <DayHabitListSkeleton count={3} />
                        ) : dayHabits.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>
                                <p>No habits scheduled for this day</p>
                                <a href="/app/habits" style={{ color: 'var(--brand-400)', fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>Add your first habit →</a>
                            </div>
                        ) : dayHabits.map((habit: any) => (
                            <div key={habit.id} className="card card-sm" style={{
                                borderColor: habit.completed ? 'rgba(34,197,94,0.2)' : 'var(--border-color)',
                                background: habit.completed ? 'rgba(34,197,94,0.05)' : 'var(--bg-card)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {/* Color swatch */}
                                    <div style={{ width: 4, height: 40, borderRadius: 99, background: habit.color || '#6366f1', flexShrink: 0 }} />
                                    {/* Checkbox */}
                                    {habit.subHabits.length === 0 && (
                                        <button onClick={() => toggleMut.mutate({ habitId: habit.id, completed: !habit.completed })}
                                            style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${habit.completed ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, background: habit.completed ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {habit.completed && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                                        </button>
                                    )}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', textDecoration: habit.completed ? 'line-through' : 'none', opacity: habit.completed ? 0.7 : 1 }}>{habit.title}</div>
                                        {habit.category && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{habit.category}</span>}
                                    </div>
                                    {/* Progress for sub habits */}
                                    {habit.subHabits.length > 0 && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                            {habit.subHabits.filter((s: any) => s.completed).length}/{habit.subHabits.length}
                                        </span>
                                    )}
                                </div>
                                {/* Sub-habits */}
                                {habit.subHabits.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {habit.subHabits.map((sub: any) => (
                                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <button onClick={() => subToggleMut.mutate({ subId: sub.id, completed: !sub.completed })}
                                                    style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sub.completed ? '#22c55e' : 'rgba(255,255,255,0.15)'}`, background: sub.completed ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {sub.completed && <span style={{ color: 'white', fontSize: '0.55rem' }}>✓</span>}
                                                </button>
                                                <span style={{ fontSize: '0.8rem', color: sub.completed ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: sub.completed ? 'line-through' : 'none' }}>{sub.content}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
