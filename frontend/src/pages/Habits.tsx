import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
    ChevronUp, ChevronRight, ChevronDown, Sparkles, ListTodo,
    Edit2, Trash2, Bell, BellOff, Clock, Plus,
} from 'lucide-react';
import { fetchHabits, createHabit, deleteHabit, updateHabit, parseHabitFromText } from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { HabitListSkeleton } from '../components/Skeleton';
import { errMsg } from '../lib/errors';
import { fadeRise, staggerList, springs, useMotionOK } from '../lib/motion';
import Modal from '../components/Modal';
import { UnlitKindling } from '../components/Art';

/* Habit colours read as pigments — earths and fired clays that belong in the
   ember room. The old set was SaaS indigo/violet/pink and fought the ground. */
const COLORS = ['#f2b544', '#e2703a', '#c0553c', '#a8763f', '#7d8c5c', '#4f8f8b', '#8a6ea8'];
const CATEGORIES = ['Health', 'Work', 'Learning', 'Mindfulness', 'Lifestyle', 'Other'];

const FREQUENCIES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly (Mon)' },
    { value: 'custom', label: 'Custom days' },
    { value: 'once', label: 'Just once' },
];

const DURATIONS = [
    { value: 'forever', label: 'Forever' },
    { value: '1week', label: '1 week' },
    { value: '2weeks', label: '2 weeks' },
    { value: '1month', label: '1 month' },
    { value: '3months', label: '3 months' },
    { value: 'until_end', label: 'Until the habit ends' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRIORITY = {
    1: { icon: ChevronUp, label: 'High', color: 'var(--gold)' },
    2: { icon: ChevronRight, label: 'Medium', color: 'var(--copper-lit)' },
    3: { icon: ChevronDown, label: 'Low', color: 'var(--cold)' },
} as const;

// ─── Habit card ─────────────────────────────────────────────────────
function HabitCard({ habit, onEdit, onDelete }: { habit: any; onEdit: (h: any) => void; onDelete: (id: string) => void }) {
    const reminder = habit.reminders?.[0];
    const p = PRIORITY[(habit.priority ?? 2) as 1 | 2 | 3] ?? PRIORITY[2];
    const PIcon = p.icon;

    return (
        <div className="card card--sm">
            <div className="row row--top">
                <span className="rule" style={{ background: habit.color || 'var(--copper)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-bold" style={{ marginBottom: '0.15rem' }}>{habit.title}</div>
                    {habit.description && <p className="t-sm" style={{ marginBottom: '0.5rem' }}>{habit.description}</p>}
                    <div className="row row--wrap" style={{ gap: '0.35rem' }}>
                        {habit.category && <span className="badge badge--neutral">{habit.category}</span>}
                        <span className="badge badge--neutral" style={{ color: p.color }}>
                            <PIcon size={11} /> {p.label}
                        </span>
                        {habit.aiGenerated && <span className="badge badge--ai"><Sparkles size={11} /> AI</span>}
                        {habit.subHabits?.length > 0 && (
                            <span className="badge badge--neutral"><ListTodo size={11} /> {habit.subHabits.length} steps</span>
                        )}
                        {reminder && (
                            <span className="badge badge--burning">
                                <Bell size={11} /> {reminder.reminderTime || '08:00'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="row" style={{ gap: '0.3rem', flexShrink: 0 }}>
                    <button className="btn btn--ghost btn--icon btn--sm" onClick={() => onEdit(habit)} aria-label={`Edit ${habit.title}`}>
                        <Edit2 size={15} />
                    </button>
                    <button className="btn btn--danger btn--icon btn--sm" onClick={() => onDelete(habit.id)} aria-label={`Delete ${habit.title}`}>
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Reminder sub-form ──────────────────────────────────────────────
type ReminderState = { enabled: boolean; frequency: string; time: string; days: number[]; duration: string; message: string };

function ReminderSection({ reminder, onChange }: { reminder: ReminderState; onChange: (r: ReminderState) => void }) {
    const motionOK = useMotionOK();
    const set = (key: keyof ReminderState, value: unknown) => onChange({ ...reminder, [key]: value });

    const toggleDay = (day: number) => {
        const days = reminder.days.includes(day)
            ? reminder.days.filter((d) => d !== day)
            : [...reminder.days, day].sort();
        set('days', days);
    };

    return (
        <div className={`card card--sm ${reminder.enabled ? 'card--lit' : 'card--sunk'}`} style={{ padding: '1rem' }}>
            <button
                type="button"
                className="row row--between"
                onClick={() => set('enabled', !reminder.enabled)}
                aria-pressed={reminder.enabled}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left', padding: 0 }}
            >
                <span className="row">
                    {reminder.enabled ? <Bell size={17} color="var(--gold)" /> : <BellOff size={17} color="var(--cold)" />}
                    <span>
                        <span className="t-semi" style={{ display: 'block', fontSize: '0.88rem' }}>Email reminders</span>
                        <span className="t-xs t-ash">
                            {reminder.enabled ? 'A nudge lands in your inbox on schedule' : 'Turn on to get a nudge on schedule'}
                        </span>
                    </span>
                </span>
                <span className="switch" data-on={reminder.enabled}>
                    <motion.span
                        className="switch-knob"
                        animate={{ x: reminder.enabled ? 18 : 0 }}
                        transition={motionOK ? springs.settle : { duration: 0 }}
                    />
                </span>
            </button>

            <AnimatePresence initial={false}>
                {reminder.enabled && (
                    <motion.div
                        initial={motionOK ? { height: 0, opacity: 0 } : false}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={springs.settle}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="stack stack--lg" style={{ marginTop: '1rem' }}>
                            <div>
                                <label className="label">Frequency</label>
                                <div className="row row--wrap" style={{ gap: '0.35rem' }}>
                                    {FREQUENCIES.map((f) => (
                                        <button
                                            key={f.value}
                                            type="button"
                                            className={`btn btn--sm ${reminder.frequency === f.value ? 'btn--primary' : 'btn--secondary'}`}
                                            onClick={() => set('frequency', f.value)}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {reminder.frequency === 'custom' && (
                                <div>
                                    <label className="label">Which days</label>
                                    <div className="row row--wrap" style={{ gap: '0.3rem' }}>
                                        {DAY_LABELS.map((label, idx) => {
                                            const on = reminder.days.includes(idx);
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => toggleDay(idx)}
                                                    aria-pressed={on}
                                                    className={`btn btn--sm ${on ? 'btn--primary' : 'btn--secondary'}`}
                                                    style={{ minWidth: 46, padding: '0.35rem 0.4rem' }}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="label"><Clock size={11} /> Time</label>
                                <input
                                    className="input"
                                    type="time"
                                    value={reminder.time}
                                    onChange={(e) => set('time', e.target.value)}
                                    style={{ maxWidth: 160 }}
                                />
                            </div>

                            <div>
                                <label className="label">Keep sending for</label>
                                <select className="select" value={reminder.duration} onChange={(e) => set('duration', e.target.value)}>
                                    {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="label">Message</label>
                                <textarea
                                    className="textarea"
                                    value={reminder.message}
                                    onChange={(e) => set('message', e.target.value)}
                                    placeholder="Leave empty and the AI writes one for you each time"
                                    style={{ minHeight: 60 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Habit modal ────────────────────────────────────────────────────
function HabitForm({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (data: any) => void }) {
    const today = new Date().toISOString().split('T')[0];
    const existing = initial?.reminders?.[0];

    const [form, setForm] = useState({
        title: initial?.title || '',
        description: initial?.description || '',
        priority: initial?.priority || 2,
        category: initial?.category || 'Health',
        color: initial?.color || COLORS[0],
        startDate: initial?.startDate || today,
        endDate: initial?.endDate || '',
        subHabits: initial?.subHabits?.map((s: any) => s.content || s).join('\n') || '',
    });

    const [reminder, setReminder] = useState<ReminderState>(
        existing
            ? {
                enabled: true,
                frequency: existing.reminderFrequency || 'daily',
                time: existing.reminderTime || '08:00',
                days: existing.reminderDays || [],
                duration: 'forever',
                message: existing.message || '',
            }
            : { enabled: false, frequency: 'daily', time: '08:00', days: [], duration: 'forever', message: '' },
    );

    const [nlp, setNlp] = useState('');
    const [nlpLoading, setNlpLoading] = useState(false);
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const parseNLP = async () => {
        if (!nlp.trim()) return;
        setNlpLoading(true);
        try {
            const parsed = await parseHabitFromText(nlp);
            setForm((f) => ({
                ...f,
                title: parsed.title || f.title,
                description: parsed.description || f.description,
                priority: parsed.priority || f.priority,
                category: parsed.category || f.category,
                color: parsed.color || f.color,
                startDate: parsed.startDate || f.startDate,
                endDate: parsed.endDate || f.endDate,
                subHabits: parsed.subHabits?.join('\n') || f.subHabits,
            }));
        } catch { /* the form simply stays as the user left it */ }
        finally { setNlpLoading(false); }
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

        if (reminder.enabled) {
            payload.reminder = {
                enabled: true,
                frequency: reminder.frequency,
                time: reminder.time,
                days: reminder.frequency === 'custom' ? reminder.days : undefined,
                duration: reminder.duration,
                message: reminder.message || undefined,
            };
        } else if (initial && existing) {
            payload.reminder = { enabled: false, frequency: 'daily', time: '08:00' };
        }

        onSave(payload);
    };

    return (
        <form onSubmit={submit} className="stack stack--lg">
            {!initial && (
                <div className="card card--sm card--ai card--static">
                    <label className="label t-cyan"><Sparkles size={12} /> Describe it in plain words</label>
                    <div className="row" style={{ gap: '0.5rem' }}>
                        <input
                            className="input"
                            placeholder="Meditate 10 minutes every morning"
                            value={nlp}
                            onChange={(e) => setNlp(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); parseNLP(); } }}
                        />
                        <button type="button" className="btn btn--ai btn--sm" onClick={parseNLP} disabled={nlpLoading} style={{ flexShrink: 0 }}>
                            {nlpLoading ? 'Reading…' : 'Fill form'}
                        </button>
                    </div>
                </div>
            )}

            <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={set('title')} required placeholder="Morning meditation" />
            </div>

            <div>
                <label className="label">Description</label>
                <textarea className="textarea" value={form.description} onChange={set('description')} placeholder="Optional" style={{ minHeight: 58 }} />
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
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
                <label className="label">Colour</label>
                <div className="row row--wrap" style={{ gap: '0.5rem' }}>
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, color: c }))}
                            aria-label={`Colour ${c}`}
                            aria-pressed={form.color === c}
                            style={{
                                width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                                border: form.color === c ? '2px solid var(--ink)' : '2px solid transparent',
                                boxShadow: form.color === c ? `0 0 10px ${c}aa` : 'none',
                                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
                <div>
                    <label className="label">Starts</label>
                    <input className="input" type="date" value={form.startDate} onChange={set('startDate')} required />
                </div>
                <div>
                    <label className="label">Ends</label>
                    <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
                </div>
            </div>

            <div>
                <label className="label">Steps, one per line</label>
                <textarea
                    className="textarea"
                    value={form.subHabits}
                    onChange={set('subHabits')}
                    placeholder={'Inhale for 4 counts\nHold for 4 counts\nExhale for 4 counts'}
                />
            </div>

            <ReminderSection reminder={reminder} onChange={setReminder} />

            <div className="modal-actions" style={{ marginTop: 0 }}>
                <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn--primary">
                    {initial ? 'Save changes' : 'Create habit'}
                </button>
            </div>
        </form>
    );
}

// ─── Page ───────────────────────────────────────────────────────────
export default function Habits() {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [filter, setFilter] = useState('all');
    const motionOK = useMotionOK();
    const qc = useQueryClient();
    const toast = useToast();
    const confirm = useConfirm();

    const { data: habits = [], isLoading } = useQuery({ queryKey: ['habits'], queryFn: () => fetchHabits() });

    const createMut = useMutation({
        mutationFn: createHabit,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits'] });
            qc.invalidateQueries({ queryKey: ['profile'] });
            setCreating(false);
            toast.success('Habit created');
        },
        onError: (e) => toast.error(errMsg(e, 'Could not create the habit')),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateHabit(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits'] });
            setEditing(null);
            toast.success('Habit updated');
        },
        onError: (e) => toast.error(errMsg(e, 'Could not save the habit')),
    });

    const deleteMut = useMutation({
        mutationFn: deleteHabit,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits'] });
            toast.success('Habit deleted');
        },
        onError: (e) => toast.error(errMsg(e, 'Could not delete the habit')),
    });

    const filtered = habits.filter((h: any) => filter === 'all' || h.category === filter);

    const remove = async (id: string) => {
        const ok = await confirm({
            title: 'Delete habit?',
            message: 'The habit and everything you have logged against it are removed for good.',
            confirmText: 'Delete',
            danger: true,
        });
        if (ok) deleteMut.mutate(id);
    };

    return (
        <div className="page page--narrow">
            <div className="page-head">
                <div>
                    <div className="eyebrow">Your fires</div>
                    <h1>Habits</h1>
                    <p>{habits.length} habit{habits.length === 1 ? '' : 's'} being kept</p>
                </div>
                <button className="btn btn--primary" onClick={() => setCreating(true)}>
                    <Plus size={16} /> New habit
                </button>
            </div>

            <div className="seg" style={{ marginBottom: '1.5rem' }}>
                {['all', ...CATEGORIES].map((cat) => (
                    <button
                        key={cat}
                        className="seg-item"
                        aria-selected={filter === cat}
                        role="tab"
                        onClick={() => setFilter(cat)}
                    >
                        {filter === cat && (
                            <motion.span
                                className="seg-marker"
                                layoutId={motionOK ? 'habit-filter' : undefined}
                                transition={springs.settle}
                            />
                        )}
                        {cat === 'all' ? 'All' : cat}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <HabitListSkeleton count={4} />
            ) : filtered.length === 0 ? (
                <div className="card empty card--static">
                    <span className="empty-art"><UnlitKindling /></span>
                    <h3>{filter === 'all' ? 'No habits yet' : `Nothing in ${filter}`}</h3>
                    <p>{filter === 'all' ? 'A habit is a fire you feed daily. Light the first one.' : 'Try another category, or add a habit here.'}</p>
                    <button className="btn btn--primary" onClick={() => setCreating(true)}>
                        <Plus size={16} /> {filter === 'all' ? 'Light the first one' : 'New habit'}
                    </button>
                </div>
            ) : (
                <motion.div
                    className="stack"
                    variants={motionOK ? staggerList : undefined}
                    initial={motionOK ? 'hidden' : false}
                    animate="show"
                >
                    <AnimatePresence mode="popLayout">
                        {filtered.map((habit: any) => (
                            <motion.div
                                key={habit.id}
                                layout
                                variants={motionOK ? fadeRise : undefined}
                                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                                transition={springs.settle}
                            >
                                <HabitCard habit={habit} onEdit={setEditing} onDelete={remove} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            <Modal open={creating} onClose={() => setCreating(false)} title="New habit" width={580}>
                <HabitForm onClose={() => setCreating(false)} onSave={(data) => createMut.mutate(data)} />
            </Modal>

            <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit habit" width={580}>
                {editing && (
                    <HabitForm
                        initial={editing}
                        onClose={() => setEditing(null)}
                        onSave={(data) => updateMut.mutate({ id: editing.id, data })}
                    />
                )}
            </Modal>
        </div>
    );
}
