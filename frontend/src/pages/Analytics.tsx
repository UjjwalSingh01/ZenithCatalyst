import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchAnalytics, fetchMoodCorrelation, upsertMood } from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { errMsg } from '../lib/errors';
import { BarChart3, CheckCircle2, Pin, Target, Frown, Meh, Smile, Battery, BatteryCharging, BatteryFull, Zap, ZapOff } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

const RANGE_OPTIONS = [
    { label: '7 Days', value: 'week' },
    { label: '30 Days', value: 'month' },
    { label: '1 Year', value: 'year' },
];

const PIE_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6'];

function StatCard({ icon, label, value, sub, color = '#6366f1' }: any) {
    return (
        <div className="card card-sm" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Outfit', color }}>{value}</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
        </div>
    );
}

export default function Analytics() {
    const [range, setRange] = useState('month');
    const [moodForm, setMoodForm] = useState({ mood: 3, energy: 3, note: '' });
    const today = new Date().toISOString().split('T')[0];

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

    const toast = useToast();
    const moodMut = useMutation({
        mutationFn: upsertMood,
        onSuccess: () => toast.success('Mood logged'),
        onError: (e) => toast.error(errMsg(e, 'Failed to log mood')),
    });

    const timeline = data?.timeline?.filter((t: any) => t.total > 0) ?? [];
    const habitStats = data?.habitStats ?? [];
    const categories = data?.categories ?? [];
    const summary = data?.summary ?? {};

    const formatDate = (dateStr: string) => {
        try { return format(parseISO(dateStr), range === 'year' ? 'MMM' : 'MMM d'); } catch { return dateStr; }
    };

    return (
        <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Analytics</h1>
                    <p className="text-secondary">Deep insights into your habit performance</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {RANGE_OPTIONS.map(({ label, value }) => (
                        <button key={value} className={`btn btn-sm ${range === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange(value)}>{label}</button>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)
                ) : (
                    <>
                        <StatCard icon={<BarChart3 className="w-8 h-8 mx-auto mb-1 text-indigo-400" />} label="Overall Rate" value={`${summary.overallRate ?? 0}%`} color={summary.overallRate >= 70 ? '#22c55e' : '#f59e0b'} />
                        <StatCard icon={<Pin className="w-8 h-8 mx-auto mb-1 text-purple-400" />} label="Active Habits" value={summary.totalHabits ?? 0} sub="currently tracking" />
                        <StatCard icon={<CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-green-400" />} label="Completions" value={summary.totalCompleted ?? 0} sub={`of ${summary.totalPossible ?? 0} possible`} />
                        <StatCard icon={<Target className="w-8 h-8 mx-auto mb-1 text-pink-400" />} label="Top Performer" value={habitStats[0]?.completionRate ? `${habitStats[0].completionRate}%` : '-'} sub={habitStats[0]?.title?.slice(0, 18) || 'No data yet'} />
                    </>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Completion Timeline */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Daily Completion Rate</h3>
                    {timeline.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data yet. Complete some habits to see trends!</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} unit="%" />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-bright)', borderRadius: 10 }}
                                    labelFormatter={(v) => formatDate(v)} formatter={(v: any) => [`${v}%`, 'Completion']}
                                />
                                <Line type="monotone" dataKey="completionRate" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#6366f1' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Category Distribution */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>By Category</h3>
                    {categories.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No categorized habits</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={categories} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="count" nameKey="name" paddingAngle={3}>
                                    {categories.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-bright)', borderRadius: 10 }} />
                                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Per-Habit Bar Chart */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Habit Comparison</h3>
                    {habitStats.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No habit data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={habitStats.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} unit="%" />
                                <YAxis type="category" dataKey="title" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={90} />
                                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-bright)', borderRadius: 10 }} formatter={(v: any) => [`${v}%`, 'Completion Rate']} />
                                <Bar dataKey="completionRate" radius={[0, 6, 6, 0]}>
                                    {habitStats.slice(0, 8).map((h: any, i: number) => <Cell key={i} fill={h.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Mood Logger */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Log Today's Mood</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <div>
                            <label className="label flex items-center gap-2">Mood: {[<Frown key={1} className="text-red-500 w-4 h-4" />, <Frown key={2} className="text-orange-500 w-4 h-4" />, <Meh key={3} className="text-yellow-500 w-4 h-4" />, <Smile key={4} className="text-green-400 w-4 h-4" />, <Smile key={5} className="text-green-500 w-4 h-4" />][moodForm.mood - 1]}</label>
                            <input type="range" min={1} max={5} value={moodForm.mood} onChange={(e) => setMoodForm((f) => ({ ...f, mood: +e.target.value }))}
                                style={{ width: '100%', accentColor: '#6366f1' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                <span>Awful</span><span>Amazing</span>
                            </div>
                        </div>
                        <div>
                            <label className="label flex items-center gap-2">Energy: {[<ZapOff key={1} className="text-gray-500 w-4 h-4" />, <Battery key={2} className="text-red-500 w-4 h-4" />, <BatteryCharging key={3} className="text-yellow-500 w-4 h-4" />, <BatteryFull key={4} className="text-green-400 w-4 h-4" />, <Zap key={5} className="text-yellow-400 w-4 h-4" />][moodForm.energy - 1]}</label>
                            <input type="range" min={1} max={5} value={moodForm.energy} onChange={(e) => setMoodForm((f) => ({ ...f, energy: +e.target.value }))}
                                style={{ width: '100%', accentColor: '#a855f7' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                <span>Drained</span><span>Supercharged</span>
                            </div>
                        </div>
                        <div>
                            <label className="label">Note (optional)</label>
                            <input className="input" value={moodForm.note} onChange={(e) => setMoodForm((f) => ({ ...f, note: e.target.value }))} placeholder="How are you feeling?" />
                        </div>
                        <button className="btn btn-primary" onClick={() => moodMut.mutate({ date: today, ...moodForm })} disabled={moodMut.isPending}>
                            {moodMut.isPending ? 'Saving...' : moodMut.isSuccess ? '✅ Saved!' : 'Log Mood'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mood Correlation (if data available) */}
            {moodData?.correlation?.length > 2 && (
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Mood vs Habit Completion</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={moodData.correlation}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" tickFormatter={(v) => format(parseISO(v), 'MMM d')} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                            <YAxis yAxisId="left" domain={[1, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-bright)', borderRadius: 10 }} />
                            <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{v}</span>} />
                            <Line yAxisId="left" type="monotone" dataKey="mood" name="Mood (1-5)" stroke="#a855f7" strokeWidth={2} dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion %" stroke="#22c55e" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
