import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
    Flame, CheckCircle2, Layers, Trophy,
    Frown, Meh, Smile, Laugh, Angry,
    BatteryLow, BatteryMedium, BatteryFull, Zap, ZapOff,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fetchAnalytics, fetchMoodCorrelation, upsertMood } from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { errMsg } from '../lib/errors';
import { StatCardsSkeleton } from '../components/Skeleton';
import { springs, useMotionOK } from '../lib/motion';
import Counter from '../components/Counter';
import Reveal from '../components/Reveal';
import { BlankLedger } from '../components/Art';

const RANGES = [
    { label: '7 days', value: 'week' },
    { label: '30 days', value: 'month' },
    { label: '1 year', value: 'year' },
];

const PIGMENTS = ['#f2b544', '#e2703a', '#c0553c', '#a8763f', '#7d8c5c', '#4f8f8b', '#8a6ea8'];

/* Recharts renders into SVG outside our CSS cascade, so it needs literal
   values rather than custom properties. */
const AXIS = { fill: 'rgba(245,235,228,0.38)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' };
const GRID = 'rgba(245,235,228,0.07)';
const TOOLTIP = {
    background: '#221816',
    border: '1px solid rgba(245,235,228,0.18)',
    borderRadius: 10,
    fontFamily: 'Inter Tight, sans-serif',
    fontSize: 12,
};

const MOODS = [
    { Icon: Angry, color: '#5a6b78', word: 'Awful' },
    { Icon: Frown, color: '#8f5334', word: 'Low' },
    { Icon: Meh, color: '#c97b4e', word: 'Fine' },
    { Icon: Smile, color: '#e2996a', word: 'Good' },
    { Icon: Laugh, color: '#f2b544', word: 'Great' },
];

const ENERGY = [
    { Icon: ZapOff, color: '#5a6b78', word: 'Drained' },
    { Icon: BatteryLow, color: '#8f5334', word: 'Low' },
    { Icon: BatteryMedium, color: '#c97b4e', word: 'Steady' },
    { Icon: BatteryFull, color: '#e2996a', word: 'Strong' },
    { Icon: Zap, color: '#f2b544', word: 'Charged' },
];

function StatCard({ icon, label, value, suffix = '', sub, color = 'var(--ink)' }: {
    icon: React.ReactNode; label: string; value: number; suffix?: string; sub?: string; color?: string;
}) {
    return (
        <div className="card card--sm stat">
            <span style={{ color, marginBottom: '0.35rem' }}>{icon}</span>
            <Counter value={value} suffix={suffix} className="tally stat-value" style={{ color }} />
            <span className="stat-label">{label}</span>
            {sub && <span className="stat-sub">{sub}</span>}
        </div>
    );
}

export default function Analytics() {
    const [range, setRange] = useState('month');
    const [mood, setMood] = useState({ mood: 3, energy: 3, note: '' });
    const motionOK = useMotionOK();
    const today = new Date().toISOString().split('T')[0];
    const toast = useToast();

    const { data, isLoading } = useQuery({
        queryKey: ['analytics', range],
        queryFn: () => fetchAnalytics(range),
        staleTime: 2 * 60_000,
    });

    const { data: moodData } = useQuery({
        queryKey: ['mood-correlation'],
        queryFn: fetchMoodCorrelation,
        staleTime: 5 * 60_000,
    });

    const moodMut = useMutation({
        mutationFn: upsertMood,
        onSuccess: () => toast.success('Mood logged'),
        onError: (e) => toast.error(errMsg(e, 'Could not log your mood')),
    });

    const timeline = data?.timeline?.filter((t: any) => t.total > 0) ?? [];
    const habitStats = data?.habitStats ?? [];
    const categories = data?.categories ?? [];
    const summary = data?.summary ?? {};

    const fmtDate = (d: string) => {
        try { return format(parseISO(d), range === 'year' ? 'MMM' : 'd MMM'); } catch { return d; }
    };

    const overall = summary.overallRate ?? 0;
    const M = MOODS[mood.mood - 1];
    const E = ENERGY[mood.energy - 1];

    // Charts with no data get the same ledger mark, sized down — a chart that
    // simply says "no data" in grey is a dead end, not an empty state.
    const Empty = ({ children }: { children: React.ReactNode }) => (
        <div
            className="t-center t-ash t-sm"
            style={{ padding: '1.25rem 1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}
        >
            <BlankLedger size={84} />
            <span style={{ maxWidth: '30ch' }}>{children}</span>
        </div>
    );

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <div className="eyebrow">The record</div>
                    <h1>Analytics</h1>
                </div>
                <div className="seg" role="tablist">
                    {RANGES.map(({ label, value }) => (
                        <button
                            key={value}
                            role="tab"
                            className="seg-item"
                            aria-selected={range === value}
                            onClick={() => setRange(value)}
                        >
                            {range === value && (
                                <motion.span className="seg-marker" layoutId={motionOK ? 'range' : undefined} transition={springs.settle} />
                            )}
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
                {isLoading ? (
                    <StatCardsSkeleton count={4} />
                ) : (
                    <>
                        <StatCard
                            icon={<Flame size={22} />}
                            label="Overall rate"
                            value={overall}
                            suffix="%"
                            color={overall >= 80 ? 'var(--gold)' : overall >= 40 ? 'var(--copper-lit)' : 'var(--cold)'}
                            sub={`across ${range === 'week' ? '7 days' : range === 'month' ? '30 days' : 'the year'}`}
                        />
                        <StatCard
                            icon={<Layers size={22} />}
                            label="Active habits"
                            value={summary.totalHabits ?? 0}
                            color="var(--copper-lit)"
                            sub="being kept"
                        />
                        <StatCard
                            icon={<CheckCircle2 size={22} />}
                            label="Completions"
                            value={summary.totalCompleted ?? 0}
                            color="var(--gold)"
                            sub={`of ${summary.totalPossible ?? 0} possible`}
                        />
                        <StatCard
                            icon={<Trophy size={22} />}
                            label="Best habit"
                            value={habitStats[0]?.completionRate ?? 0}
                            suffix="%"
                            color="var(--copper-lit)"
                            sub={habitStats[0]?.title?.slice(0, 20) || 'Nothing logged yet'}
                        />
                    </>
                )}
            </div>

            <div className="grid-wide" style={{ marginBottom: '1.25rem' }}>
                <div className="card card--static">
                    <h3 className="card-title">Daily completion</h3>
                    {timeline.length === 0 ? (
                        <Empty>Complete a few habits and the trend shows up here.</Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <LineChart data={timeline} margin={{ top: 5, right: 8, left: -22, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="burn" x1="0" y1="1" x2="0" y2="0">
                                        <stop offset="0%" stopColor="#8f5334" />
                                        <stop offset="55%" stopColor="#c97b4e" />
                                        <stop offset="100%" stopColor="#f2b544" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
                                <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS} stroke={GRID} />
                                <YAxis domain={[0, 100]} tick={AXIS} unit="%" stroke={GRID} />
                                <Tooltip
                                    contentStyle={TOOLTIP}
                                    cursor={{ stroke: '#c97b4e', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    labelFormatter={fmtDate}
                                    formatter={(v: any) => [`${v}%`, 'Complete']}
                                />
                                {/* The line burns hotter as it climbs. */}
                                <Line
                                    type="monotone"
                                    dataKey="completionRate"
                                    stroke="url(#burn)"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#f2b544', stroke: '#16100f', strokeWidth: 2 }}
                                    isAnimationActive={motionOK}
                                    animationDuration={900}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card card--static">
                    <h3 className="card-title">By category</h3>
                    {categories.length === 0 ? (
                        <Empty>No categorised habits yet.</Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <PieChart>
                                <Pie
                                    data={categories}
                                    cx="50%" cy="46%"
                                    innerRadius={52} outerRadius={80}
                                    dataKey="count" nameKey="name"
                                    paddingAngle={3}
                                    stroke="#16100f"
                                    strokeWidth={2}
                                    isAnimationActive={motionOK}
                                >
                                    {categories.map((_: any, i: number) => (
                                        <Cell key={i} fill={PIGMENTS[i % PIGMENTS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP} />
                                <Legend
                                    iconType="circle"
                                    iconSize={7}
                                    formatter={(v) => <span style={{ color: 'rgba(245,235,228,0.62)', fontSize: 12 }}>{v}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <Reveal>
            <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
                <div className="card card--static">
                    <h3 className="card-title">Habit by habit</h3>
                    {habitStats.length === 0 ? (
                        <Empty>Nothing logged yet.</Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <BarChart data={habitStats.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 12, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="2 4" stroke={GRID} horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={AXIS} unit="%" stroke={GRID} />
                                <YAxis type="category" dataKey="title" tick={{ ...AXIS, fontFamily: 'Inter Tight, sans-serif' }} width={92} stroke={GRID} />
                                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(242,181,68,0.06)' }} formatter={(v: any) => [`${v}%`, 'Complete']} />
                                <Bar dataKey="completionRate" radius={[0, 5, 5, 0]} isAnimationActive={motionOK}>
                                    {habitStats.slice(0, 8).map((h: any, i: number) => (
                                        <Cell key={i} fill={h.color || PIGMENTS[i % PIGMENTS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card card--static">
                    <h3 className="card-title">How was today?</h3>
                    <div className="stack stack--lg">
                        <div>
                            <label className="label" style={{ color: M.color }}>
                                <M.Icon size={14} color={M.color} /> Mood — {M.word}
                            </label>
                            <input
                                className="range"
                                type="range" min={1} max={5}
                                value={mood.mood}
                                onChange={(e) => setMood((f) => ({ ...f, mood: +e.target.value }))}
                                style={{ accentColor: M.color }}
                            />
                            <div className="range-ends"><span>Awful</span><span>Great</span></div>
                        </div>

                        <div>
                            <label className="label" style={{ color: E.color }}>
                                <E.Icon size={14} color={E.color} /> Energy — {E.word}
                            </label>
                            <input
                                className="range"
                                type="range" min={1} max={5}
                                value={mood.energy}
                                onChange={(e) => setMood((f) => ({ ...f, energy: +e.target.value }))}
                                style={{ accentColor: E.color }}
                            />
                            <div className="range-ends"><span>Drained</span><span>Charged</span></div>
                        </div>

                        <div>
                            <label className="label">Note</label>
                            <input
                                className="input"
                                value={mood.note}
                                onChange={(e) => setMood((f) => ({ ...f, note: e.target.value }))}
                                placeholder="Optional"
                            />
                        </div>

                        <button className="btn btn--primary" onClick={() => moodMut.mutate({ date: today, ...mood })} disabled={moodMut.isPending}>
                            {moodMut.isPending ? 'Saving…' : 'Log today'}
                        </button>
                    </div>
                </div>
            </div>
            </Reveal>

            {moodData?.correlation?.length > 2 && (
                <Reveal>
                <div className="card card--static">
                    <h3 className="card-title">Mood against completion</h3>
                    <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={moodData.correlation} margin={{ top: 5, right: 5, left: -22, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke={GRID} />
                            <XAxis dataKey="date" tickFormatter={(v) => format(parseISO(v), 'd MMM')} tick={AXIS} stroke={GRID} />
                            <YAxis yAxisId="left" domain={[1, 5]} tick={AXIS} stroke={GRID} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={AXIS} stroke={GRID} />
                            <Tooltip contentStyle={TOOLTIP} />
                            <Legend formatter={(v) => <span style={{ color: 'rgba(245,235,228,0.62)', fontSize: 12 }}>{v}</span>} />
                            <Line yAxisId="left" type="monotone" dataKey="mood" name="Mood" stroke="#8a6ea8" strokeWidth={2} dot={false} isAnimationActive={motionOK} />
                            <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Complete %" stroke="#f2b544" strokeWidth={2} dot={false} isAnimationActive={motionOK} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                </Reveal>
            )}
        </div>
    );
}
