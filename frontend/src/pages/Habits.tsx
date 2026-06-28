import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHabits, createHabit, deleteHabit, updateHabit, parseHabitFromText } from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { errMsg } from '../lib/errors';
import { AlertCircle, ChevronUp, ChevronRight, ChevronDown, Brain, ListTodo, Edit2, Trash2, Pin, Bell, BellOff, Clock } from 'lucide-react';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6'];
const CATEGORIES = ['Health', 'Work', 'Learning', 'Mindfulness', 'Lifestyle', 'Other'];

const FREQUENCIES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly (Mon)' },
    { value: 'custom', label: 'Custom Days' },
    { value: 'once', label: 'Just Once' },
];

const DURATIONS = [
    { value: 'forever', label: 'Forever' },
    { value: '1week', label: '1 Week' },
    { value: '2weeks', label: '2 Weeks' },
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: 'until_end', label: 'Until Habit End Date' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HabitCard({ habit, onEdit, onDelete }: { habit: any; onEdit: (h: any) => void; onDelete: (id: string) => void }) {
    const hasReminder = habit.reminders && habit.reminders.length > 0;

    return (
        <div className="card card-sm" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', transition: 'all 0.2s', borderColor: 'var(--border-color)' }}>
            <div style={{ width: 4, minHeight: 48, borderRadius: 99, background: habit.color || '#6366f1', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{habit.title}</div>
                        {habit.description && <p style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>{habit.description}</p>}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {habit.category && <span className="badge badge-brand">{habit.category}</span>}
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                {habit.priority === 1 ? <span className="flex items-center gap-1"><ChevronUp size={12} color="#ef4444" /> High</span> : habit.priority === 2 ? <span className="flex items-center gap-1"><ChevronRight size={12} color="#f59e0b" /> Medium</span> : <span className="flex items-center gap-1"><ChevronDown size={12} color="#22c55e" /> Low</span>}
                            </span>
                            {habit.aiGenerated && <span className="badge badge-brand flex items-center gap-1"><Brain size={12} /> AI</span>}
                            {habit.subHabits?.length > 0 && <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}><ListTodo size={12} /> {habit.subHabits.length} sub-tasks</span>}
                            {hasReminder && (
                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Bell size={11} /> {habit.reminders[0].reminderTime || '08:00'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(habit)} title="Edit"><Edit2 size={16} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(habit.id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReminderSection({ reminder, onChange }: {
    reminder: { enabled: boolean; frequency: string; time: string; days: number[]; duration: string; message: string };
    onChange: (r: typeof reminder) => void;
}) {
    const set = (key: string, value: unknown) => onChange({ ...reminder, [key]: value });

    const toggleDay = (day: number) => {
        const days = reminder.days.includes(day)
            ? reminder.days.filter((d: number) => d !== day)
            : [...reminder.days, day].sort();
        set('days', days);
    };

    return (
        <div style={{
            borderRadius: 14,
            border: `1px solid ${reminder.enabled ? 'rgba(34,197,94,0.25)' : 'var(--border-color)'}`,
            background: reminder.enabled ? 'rgba(34,197,94,0.04)' : 'var(--bg-card)',
            padding: '1rem',
            transition: 'all 0.3s',
        }}>
            {/* Toggle Header */}
            <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => set('enabled', !reminder.enabled)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {reminder.enabled ? <Bell size={18} color="var(--success)" /> : <BellOff size={18} color="var(--text-muted)" />}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email Reminders</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {reminder.enabled ? 'Enabled — you\'ll receive email reminders' : 'Click to enable email reminders'}
                        </div>
                    </div>
                </div>
                {/* Toggle Switch */}
                <div style={{
                    width: 44, height: 24, borderRadius: 99,
                    background: reminder.enabled ? 'var(--success)' : 'rgba(255,255,255,0.12)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                    <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3,
                        left: reminder.enabled ? 23 : 3,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                </div>
            </div>

            {/* Config Fields — shown only when enabled */}
            {reminder.enabled && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', animation: 'fadeIn 0.25s ease' }}>
                    {/* Frequency */}
                    <div>
                        <label className="label">Frequency</label>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {FREQUENCIES.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    className={`btn btn-sm ${reminder.frequency === f.value ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => set('frequency', f.value)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Day Picker */}
                    {reminder.frequency === 'custom' && (
                        <div>
                            <label className="label">Select Days</label>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                {DAY_LABELS.map((label, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => toggleDay(idx)}
                                        style={{
                                            width: 40, height: 36, borderRadius: 8,
                                            border: reminder.days.includes(idx) ? '2px solid var(--brand-500)' : '1px solid var(--border-color)',
                                            background: reminder.days.includes(idx) ? 'rgba(99,102,241,0.2)' : 'var(--bg-card)',
                                            color: reminder.days.includes(idx) ? 'var(--brand-400)' : 'var(--text-secondary)',
                                            fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Time */}
                    <div>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={12} /> Time
                        </label>
                        <input
                            className="input"
                            type="time"
                            value={reminder.time}
                            onChange={(e) => set('time', e.target.value)}
                            style={{ maxWidth: 160 }}
                        />
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="label">Duration</label>
                        <select className="select" value={reminder.duration} onChange={(e) => set('duration', e.target.value)}>
                            {DURATIONS.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Message */}
                    <div>
                        <label className="label">Custom Message (optional)</label>
                        <textarea
                            className="textarea"
                            value={reminder.message}
                            onChange={(e) => set('message', e.target.value)}
                            placeholder="Leave empty for AI-generated motivational messages"
                            style={{ minHeight: 60 }}
                        />
                        <p className="text-muted text-xs" style={{ marginTop: '0.2rem' }}>
                            💡 Leave blank to get AI-generated motivational messages in each email
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function HabitModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (data: any) => void }) {
    const today = new Date().toISOString().split('T')[0];

    // Extract existing reminder config from habit data
    const existingReminder = initial?.reminders?.[0];
    const initialReminder = existingReminder
        ? {
            enabled: true,
            frequency: existingReminder.reminderFrequency || 'daily',
            time: existingReminder.reminderTime || '08:00',
            days: existingReminder.reminderDays || [],
            duration: 'forever',
            message: existingReminder.message || '',
        }
        : { enabled: false, frequency: 'daily', time: '08:00', days: [] as number[], duration: 'forever', message: '' };

    const [form, setForm] = useState({
        title: initial?.title || '', description: initial?.description || '',
        priority: initial?.priority || 2, category: initial?.category || 'Health',
        color: initial?.color || '#6366f1', startDate: initial?.startDate || today,
        endDate: initial?.endDate || '', subHabits: initial?.subHabits?.map((s: any) => s.content || s).join('\n') || '',
    });
    const [reminder, setReminder] = useState(initialReminder);
    const [nlp, setNlp] = useState('');
    const [nlpLoading, setNlpLoading] = useState(false);
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const parseNLP = async () => {
        if (!nlp.trim()) return;
        setNlpLoading(true);
        try {
            const parsed = await parseHabitFromText(nlp);
            setForm((f) => ({
                ...f, title: parsed.title || f.title, description: parsed.description || f.description,
                priority: parsed.priority || f.priority, category: parsed.category || f.category,
                color: parsed.color || f.color, startDate: parsed.startDate || f.startDate,
                endDate: parsed.endDate || f.endDate,
                subHabits: parsed.subHabits?.join('\n') || f.subHabits,
            }));
        } catch { } finally { setNlpLoading(false); }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const subs = form.subHabits.split('\n').map((s: string) => s.trim()).filter(Boolean);
        const payload: Record<string, unknown> = {
            ...form,
            priority: Number(form.priority),
            endDate: form.endDate || null,
            subHabits: subs,
        };

        // Include reminder config
        if (reminder.enabled) {
            payload.reminder = {
                enabled: true,
                frequency: reminder.frequency,
                time: reminder.time,
                days: reminder.frequency === 'custom' ? reminder.days : undefined,
                duration: reminder.duration,
                message: reminder.message || undefined,
            };
        } else if (initial && existingReminder) {
            // Explicitly disable: send enabled=false to delete existing reminder
            payload.reminder = { enabled: false, frequency: 'daily', time: '08:00' };
        }

        onSave(payload);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 580 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>{initial ? 'Edit Habit' : 'New Habit'}</h3>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
                </div>

                {/* NLP Input */}
                {!initial && (
                    <div className="card card-glass" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                        <label className="label flex items-center gap-1 mb-2"><Brain size={14} /> AI Natural Language Parser</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input className="input" placeholder="e.g. 'Meditate for 10 min every morning'" value={nlp} onChange={(e) => setNlp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && parseNLP()} />
                            <button className="btn btn-primary btn-sm" onClick={parseNLP} disabled={nlpLoading} style={{ flexShrink: 0 }}>
                                {nlpLoading ? '...' : 'Parse'}
                            </button>
                        </div>
                        <p className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>Describe your habit in plain language — AI will fill in the form</p>
                    </div>
                )}

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="label">Title *</label>
                        <input className="input" value={form.title} onChange={set('title')} required placeholder="e.g. Morning Meditation" />
                    </div>
                    <div>
                        <label className="label">Description</label>
                        <textarea className="textarea" value={form.description} onChange={set('description')} placeholder="Optional details..." style={{ minHeight: 60 }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label className="label">Priority</label>
                            <select className="select" value={form.priority} onChange={set('priority')}>
                                <option value={1}>High</option>
                                <option value={2}>Medium</option>
                                <option value={3}>Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <select className="select" value={form.category} onChange={set('category')}>
                                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label">Color</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {COLORS.map((c) => (
                                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label className="label">Start Date *</label>
                            <input className="input" type="date" value={form.startDate} onChange={set('startDate')} required />
                        </div>
                        <div>
                            <label className="label">End Date</label>
                            <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Sub-tasks (one per line)</label>
                        <textarea className="textarea" value={form.subHabits} onChange={set('subHabits')} placeholder={"e.g. Inhale for 4 counts\nHold for 4 counts\nExhale for 4 counts"} />
                    </div>

                    {/* ─── Email Reminder Section ─── */}
                    <ReminderSection reminder={reminder} onChange={setReminder} />

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {initial ? 'Save Changes' : 'Create Habit'} →
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Habits() {
    const [showModal, setShowModal] = useState(false);
    const [editHabit, setEditHabit] = useState<any>(null);
    const [filter, setFilter] = useState<string>('all');
    const qc = useQueryClient();
    const toast = useToast();
    const confirm = useConfirm();

    const { data: habits = [], isLoading } = useQuery({ queryKey: ['habits'], queryFn: () => fetchHabits() });

    const createMut = useMutation({
        mutationFn: createHabit,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); setShowModal(false); qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('Habit created'); },
        onError: (e) => toast.error(errMsg(e, 'Failed to create habit')),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateHabit(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); setEditHabit(null); toast.success('Habit updated'); },
        onError: (e) => toast.error(errMsg(e, 'Failed to update habit')),
    });

    const deleteMut = useMutation({
        mutationFn: deleteHabit,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit deleted'); },
        onError: (e) => toast.error(errMsg(e, 'Failed to delete habit')),
    });

    const filtered = habits.filter((h: any) => filter === 'all' || h.category === filter);

    return (
        <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>My Habits</h1>
                    <p className="text-secondary">{habits.length} habit{habits.length !== 1 ? 's' : ''} tracked</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <span>+</span> New Habit
                </button>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {['all', ...CATEGORIES].map((cat) => (
                    <button key={cat} className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(cat)}>
                        {cat === 'all' ? 'All' : cat}
                    </button>
                ))}
            </div>

            {/* Habits Grid */}
            {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Pin size={48} className="text-secondary opacity-50" /></div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No habits yet</h3>
                    <p style={{ marginBottom: '1.5rem' }}>Start building your routine today</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Habit →</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map((habit: any) => (
                        <HabitCard key={habit.id} habit={habit}
                            onEdit={(h) => setEditHabit(h)}
                            onDelete={async (id) => { if (await confirm({ title: 'Delete habit?', message: 'This habit and its history will be permanently removed.', confirmText: 'Delete', danger: true })) deleteMut.mutate(id); }} />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showModal && (
                <HabitModal
                    onClose={() => setShowModal(false)}
                    onSave={(data) => createMut.mutate(data)}
                />
            )}
            {editHabit && (
                <HabitModal
                    initial={editHabit}
                    onClose={() => setEditHabit(null)}
                    onSave={(data) => updateMut.mutate({ id: editHabit.id, data })}
                />
            )}
        </div>
    );
}
