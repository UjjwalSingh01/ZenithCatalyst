import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import {
    ChevronsUp, ChevronUp, ChevronRight, ChevronDown, Sparkles, ListTodo,
    Edit2, Trash2, Bell, BellOff, Clock, Plus, Flag, GripVertical,
} from 'lucide-react';
import { fetchHabits, createHabit, deleteHabit, updateHabit, reorderHabits, parseHabitFromText } from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { HabitListSkeleton } from '../components/Skeleton';
import { errMsg } from '../lib/errors';
import { springs, useMotionOK } from '../lib/motion';
import { invalidateHabitData, invalidateHabitShape } from '../lib/invalidate';
import Modal from '../components/Modal';
import DateField from '../components/DateField';
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

/** How long a challenge runs when you flag one without saying otherwise. */
const CHALLENGE_DAYS = 30;

const isoLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return isoLocal(d);
};

/**
 * Ascending is more important, which is also the order the list sorts by.
 *
 * `points` is what a kept day of this habit is worth, and it has to match
 * backend/src/utils/points.ts — the server scores the chart, this only says so
 * where the choice is made. Medium and Low share a score on purpose: below
 * Medium there is nothing left to take away without a kept day being worth
 * nothing at all.
 */
const PRIORITY = {
    1: { icon: ChevronsUp, label: 'Very high', color: 'var(--gold)', points: 3 },
    2: { icon: ChevronUp, label: 'High', color: 'var(--copper-lit)', points: 2 },
    3: { icon: ChevronRight, label: 'Medium', color: 'var(--copper)', points: 1 },
    4: { icon: ChevronDown, label: 'Low', color: 'var(--cold)', points: 1 },
} as const;

type PriorityKey = keyof typeof PRIORITY;

/** Medium, matching the column default and the create schema. */
const DEFAULT_PRIORITY = 3;

// ─── Habit card ─────────────────────────────────────────────────────
function HabitCard({ habit, onEdit, onDelete, onToggleChallenge, onGrab, onGripKey }: {
    habit: any;
    onEdit: (h: any) => void;
    onDelete: (id: string) => void;
    onToggleChallenge: (h: any) => void;
    onGrab?: (e: React.PointerEvent) => void;
    onGripKey?: (e: React.KeyboardEvent) => void;
}) {
    const reminder = habit.reminders?.[0];
    const p = PRIORITY[(habit.priority ?? DEFAULT_PRIORITY) as PriorityKey] ?? PRIORITY[DEFAULT_PRIORITY];
    const PIcon = p.icon;

    return (
        <div className="card card--sm">
            <div className="row row--top">
                {onGrab && (
                    <button
                        type="button"
                        className="grip"
                        onPointerDown={onGrab}
                        onKeyDown={onGripKey}
                        aria-label={`Reorder ${habit.title}. Use the arrow keys to move it.`}
                        title="Drag to reorder"
                    >
                        <GripVertical size={16} />
                    </button>
                )}
                <span className="rule" style={{ background: habit.color || 'var(--copper)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-bold" style={{ marginBottom: '0.15rem' }}>{habit.title}</div>
                    {habit.description && <p className="t-sm" style={{ marginBottom: '0.5rem' }}>{habit.description}</p>}
                    <div className="row row--wrap" style={{ gap: '0.35rem' }}>
                        {habit.isChallenge && (
                            <span className="badge badge--lit">
                                <Flag size={11} /> Challenge{habit.endDate ? ` · ends ${habit.endDate}` : ''}
                            </span>
                        )}
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
                    <button
                        className={`btn btn--icon btn--sm ${habit.isChallenge ? 'btn--primary' : 'btn--ghost'}`}
                        onClick={() => onToggleChallenge(habit)}
                        aria-pressed={habit.isChallenge}
                        aria-label={habit.isChallenge ? `Stop treating ${habit.title} as a challenge` : `Make ${habit.title} a challenge`}
                        title={habit.isChallenge ? 'Stop treating as a challenge' : 'Make this a challenge'}
                    >
                        <Flag size={15} />
                    </button>
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

/**
 * One row of the draggable list.
 *
 * `dragListener={false}` with explicit drag controls means the card itself
 * isn't a drag surface — only the grip is. Without that, every press on the
 * edit or delete button would start a drag, and the card would wander when a
 * user meant to press something on it.
 */
function DraggableHabit({ habit, onDragEnd, children }: {
    habit: any;
    onDragEnd: () => void;
    children: (grab: (e: React.PointerEvent) => void) => React.ReactNode;
}) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={habit}
            dragListener={false}
            dragControls={controls}
            onDragEnd={onDragEnd}
            whileDrag={{ scale: 1.02, boxShadow: 'var(--shadow-lg)', zIndex: 2, cursor: 'grabbing' }}
            transition={springs.settle}
            style={{ position: 'relative' }}
        >
            {children((e) => controls.start(e))}
        </Reorder.Item>
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
        priority: initial?.priority || DEFAULT_PRIORITY,
        category: initial?.category || 'Health',
        color: initial?.color || COLORS[0],
        startDate: initial?.startDate || today,
        endDate: initial?.endDate || '',
        isChallenge: initial?.isChallenge || false,
        subHabits: initial?.subHabits?.map((s: any) => s.content || s).join('\n') || '',
    });
    const motionOK = useMotionOK();

    // Flagging a challenge without a finish line is the one invalid state, so
    // turning it on proposes a month rather than leaving an empty field.
    const toggleChallenge = () => setForm((f) => ({
        ...f,
        isChallenge: !f.isChallenge,
        endDate: !f.isChallenge && !f.endDate ? inDays(CHALLENGE_DAYS) : f.endDate,
    }));

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
    const [problem, setProblem] = useState('');
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

        // The dates are our own control now, so the browser no longer polices
        // them — these two rules have to be checked here.
        if (!form.startDate) return setProblem('Pick the day this starts.');
        if (form.isChallenge && !form.endDate) return setProblem('A challenge needs an end date.');
        if (form.endDate && form.endDate < form.startDate) return setProblem('It cannot end before it starts.');
        setProblem('');

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
                    {/* The score is on the option itself: priority only means
                        anything here because of what it is worth, and hiding
                        that makes the choice look cosmetic. */}
                    <select className="select" value={form.priority} onChange={set('priority')}>
                        {(Object.keys(PRIORITY) as unknown as PriorityKey[]).map((key) => {
                            const p = PRIORITY[key];
                            return (
                                <option key={key} value={key}>
                                    {p.label} · {p.points} {p.points === 1 ? 'point' : 'points'}
                                </option>
                            );
                        })}
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
                    <label className="label" htmlFor="habit-starts">Starts</label>
                    <DateField
                        id="habit-starts"
                        value={form.startDate}
                        onChange={(d) => setForm((f) => ({ ...f, startDate: d }))}
                        placeholder="Pick a start"
                    />
                </div>
                <div>
                    <label className="label" htmlFor="habit-ends">
                        Ends{form.isChallenge && <span className="t-gold"> — required</span>}
                    </label>
                    <DateField
                        id="habit-ends"
                        value={form.endDate}
                        onChange={(d) => setForm((f) => ({ ...f, endDate: d }))}
                        min={form.startDate || undefined}
                        placeholder={form.isChallenge ? 'Pick a finish line' : 'Runs on forever'}
                        clearable={!form.isChallenge}
                        required={form.isChallenge}
                    />
                </div>
            </div>

            <div className={`card card--sm ${form.isChallenge ? 'card--lit' : 'card--sunk'}`} style={{ padding: '1rem' }}>
                <button
                    type="button"
                    className="row row--between"
                    onClick={toggleChallenge}
                    aria-pressed={form.isChallenge}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left', padding: 0 }}
                >
                    <span className="row">
                        <Flag size={17} color={form.isChallenge ? 'var(--gold)' : 'var(--cold)'} />
                        <span>
                            <span className="t-semi" style={{ display: 'block', fontSize: '0.88rem' }}>Make this a challenge</span>
                            <span className="t-xs t-ash">
                                {form.isChallenge
                                    ? 'It runs to its end date and shows on the Challenges page'
                                    : 'A habit with a finish line — needs an end date'}
                            </span>
                        </span>
                    </span>
                    <span className="switch" data-on={form.isChallenge}>
                        <motion.span
                            className="switch-knob"
                            animate={{ x: form.isChallenge ? 18 : 0 }}
                            transition={motionOK ? springs.settle : { duration: 0 }}
                        />
                    </span>
                </button>
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

            {problem && <div className="banner banner--error">{problem}</div>}

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
            invalidateHabitData(qc);
            setCreating(false);
            toast.success('Habit created');
        },
        onError: (e) => toast.error(errMsg(e, 'Could not create the habit')),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateHabit(id, data),
        // This is where a habit is flagged as a challenge, so it has to reach
        // the ledger. It did not, which is why a new challenge only appeared
        // on the Challenges page after a reload.
        onSuccess: () => {
            invalidateHabitData(qc);
            setEditing(null);
            toast.success('Habit updated');
        },
        onError: (e) => toast.error(errMsg(e, 'Could not save the habit')),
    });

    const deleteMut = useMutation({
        mutationFn: deleteHabit,
        onSuccess: () => {
            invalidateHabitData(qc);
            toast.success('Habit deleted');
        },
        onError: (e) => toast.error(errMsg(e, 'Could not delete the habit')),
    });

    /* ── Manual ordering ──────────────────────────────────────────────
       The list is server state, but a drag has to move it now, not after a
       round trip — so the order is mirrored locally, moved on drag, and
       written when the drag ends. */
    const [items, setItems] = useState<any[]>([]);
    const itemsRef = useRef<any[]>([]);
    const dragging = useRef(false);
    itemsRef.current = items;

    const serverOrder = habits.map((h: any) => h.id).join();
    useEffect(() => {
        // Never let a background refetch yank the list out from under a drag.
        if (!dragging.current) setItems(habits);
    }, [serverOrder]); // eslint-disable-line react-hooks/exhaustive-deps

    const reorderMut = useMutation({
        mutationFn: reorderHabits,
        // Ordering only, so progress and streaks are left alone.
        onSuccess: () => invalidateHabitShape(qc),
        onError: (e) => {
            toast.error(errMsg(e, 'Could not save the new order'));
            setItems(habits); // put it back the way the server has it
        },
    });

    const filtered = items.filter((h: any) => filter === 'all' || h.category === filter);

    /* A filtered list only shows some of the habits, so the dragged sequence
       is spliced back into the slots those habits occupy in the full list —
       the ones you can't see keep their places. */
    const applyOrder = (nextVisible: any[]) => {
        const visible = new Set(nextVisible.map((h) => h.id));
        let k = 0;
        const merged = itemsRef.current.map((h) => (visible.has(h.id) ? nextVisible[k++] : h));
        setItems(merged);
        return merged;
    };

    const saveOrder = () => {
        dragging.current = false;
        reorderMut.mutate(itemsRef.current.map((h) => h.id));
    };

    // The grip is a real button, so the list can be reordered from the
    // keyboard as well as by dragging.
    const nudge = (habit: any, dir: -1 | 1) => {
        const from = filtered.findIndex((h: any) => h.id === habit.id);
        const to = from + dir;
        if (from < 0 || to < 0 || to >= filtered.length) return;
        const next = [...filtered];
        next.splice(to, 0, next.splice(from, 1)[0]);
        const merged = applyOrder(next);
        reorderMut.mutate(merged.map((h) => h.id));
    };

    // The flag on a card is the quick way in; a habit with no end date has to
    // pick one first, so it opens the form rather than failing at the server.
    const toggleChallenge = (habit: any) => {
        if (!habit.isChallenge && !habit.endDate) {
            toast.info('A challenge needs an end date — set one and save.');
            setEditing({ ...habit, isChallenge: true, endDate: inDays(CHALLENGE_DAYS) });
            return;
        }
        updateMut.mutate({ id: habit.id, data: { isChallenge: !habit.isChallenge } });
    };

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
                <Reorder.Group
                    as="div"
                    axis="y"
                    className="stack"
                    values={filtered}
                    onReorder={applyOrder}
                    layoutScroll
                >
                    <AnimatePresence mode="popLayout">
                        {filtered.map((habit: any) => (
                            <DraggableHabit key={habit.id} habit={habit} onDragEnd={saveOrder}>
                                {(grab) => (
                                    <HabitCard
                                        habit={habit}
                                        onEdit={setEditing}
                                        onDelete={remove}
                                        onToggleChallenge={toggleChallenge}
                                        onGrab={(e) => {
                                            dragging.current = true;
                                            // A press that never becomes a drag still has to
                                            // release the guard, or refetches stay blocked.
                                            window.addEventListener('pointerup', () => { dragging.current = false; }, { once: true });
                                            grab(e);
                                        }}
                                        onGripKey={(e) => {
                                            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                                            e.preventDefault();
                                            nudge(habit, e.key === 'ArrowUp' ? -1 : 1);
                                        }}
                                    />
                                )}
                            </DraggableHabit>
                        ))}
                    </AnimatePresence>
                </Reorder.Group>
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
