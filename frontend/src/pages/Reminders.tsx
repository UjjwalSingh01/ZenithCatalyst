import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
    Bell, Plus, Pause, Play, Edit2, Trash2, Mail, Clock, Globe, Repeat, Zap,
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { ReminderListSkeleton } from '../components/Skeleton';
import { errMsg } from '../lib/errors';
import { fadeRise, staggerList, springs, useMotionOK } from '../lib/motion';
import Modal from '../components/Modal';
import { SilentBell } from '../components/Art';

// ─── API ────────────────────────────────────────────────────────────
const fetchReminders = async () => (await api.get('/scheduler')).data.data;
const createReminder = async (data: any) => (await api.post('/scheduler', data)).data.data;
const updateReminder = async (id: string, data: any) => (await api.put(`/scheduler/${id}`, data)).data.data;
const deleteReminder = async (id: string) => { await api.delete(`/scheduler/${id}`); };
const validateSchedule = async (schedule: string) => (await api.post('/scheduler/validate', { schedule })).data.data;

const PRESETS = [
    { label: 'Daily 8am', value: '0 8 * * *' },
    { label: 'Daily 9pm', value: '0 21 * * *' },
    { label: 'Mondays 9am', value: '0 9 * * 1' },
    { label: 'Weekdays 8am', value: '0 8 * * 1-5' },
    { label: 'Once', value: 'one-time' },
    { label: 'Custom', value: 'custom' },
];

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];

const STATUS = {
    active: { cls: 'badge--lit', label: 'Active' },
    paused: { cls: 'badge--cold', label: 'Paused' },
    completed: { cls: 'badge--neutral', label: 'Sent' },
} as const;

// ─── Form ───────────────────────────────────────────────────────────
function ReminderForm({ habits, onClose, onSave, initial }: {
    habits: any[]; onClose: () => void; onSave: (d: any) => void; initial?: any;
}) {
    const [form, setForm] = useState({
        name: initial?.name || '',
        email: initial?.email || '',
        message: initial?.message || '',
        schedule: initial?.schedule || '0 8 * * *',
        timezone: initial?.timezone || 'UTC',
        isRecurring: initial?.isRecurring ?? true,
        habitId: initial?.habitId || '',
    });
    const [preset, setPreset] = useState(() => {
        if (!initial?.schedule) return '0 8 * * *';
        return PRESETS.some((p) => p.value === initial.schedule) ? initial.schedule : 'custom';
    });
    const [nextRun, setNextRun] = useState<{ ok: boolean; text: string } | null>(null);
    const [checking, setChecking] = useState(false);

    const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const pickPreset = (v: string) => {
        setPreset(v);
        setNextRun(null);
        if (v !== 'custom') setForm((f) => ({ ...f, schedule: v, isRecurring: v !== 'one-time' }));
    };

    const check = async () => {
        if (!form.schedule || form.schedule === 'one-time') {
            setNextRun({ ok: true, text: 'Sends as soon as it is saved' });
            return;
        }
        setChecking(true);
        try {
            const r = await validateSchedule(form.schedule);
            setNextRun(r.valid
                ? { ok: true, text: `Next: ${new Date(r.nextRun).toLocaleString()}` }
                : { ok: false, text: 'That is not a valid cron expression' });
        } catch {
            setNextRun({ ok: false, text: 'Could not check that expression' });
        } finally {
            setChecking(false);
        }
    };

    const custom = preset === 'custom';

    return (
        <div className="stack stack--lg">
            <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Morning meditation nudge" required />
            </div>

            <div>
                <label className="label"><Mail size={11} /> Send to</label>
                <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            </div>

            <div>
                <label className="label">Message</label>
                <textarea
                    className="textarea"
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Leave empty and the AI writes one for you"
                    style={{ minHeight: 70 }}
                />
            </div>

            {habits.length > 0 && (
                <div>
                    <label className="label">Attach to a habit</label>
                    <select className="select" value={form.habitId} onChange={set('habitId')}>
                        <option value="">None</option>
                        {habits.map((h: any) => <option key={h.id} value={h.id}>{h.title}</option>)}
                    </select>
                </div>
            )}

            <div>
                <label className="label"><Clock size={11} /> Schedule</label>
                <div className="row row--wrap" style={{ gap: '0.35rem', marginBottom: custom ? '0.5rem' : 0 }}>
                    {PRESETS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            className={`btn btn--sm ${preset === p.value ? 'btn--primary' : 'btn--secondary'}`}
                            onClick={() => pickPreset(p.value)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {custom && (
                    <div className="row" style={{ gap: '0.5rem' }}>
                        <input className="input mono" value={form.schedule} onChange={set('schedule')} placeholder="0 8 * * *" />
                        <button type="button" className="btn btn--secondary btn--sm" onClick={check} disabled={checking} style={{ flexShrink: 0 }}>
                            {checking ? 'Checking…' : 'Check'}
                        </button>
                    </div>
                )}

                {nextRun && (
                    <p className={`t-xs ${nextRun.ok ? 't-gold' : 't-cinder'}`} style={{ marginTop: '0.35rem' }}>
                        {nextRun.text}
                    </p>
                )}
            </div>

            <div>
                <label className="label"><Globe size={11} /> Timezone</label>
                <select className="select" value={form.timezone} onChange={set('timezone')}>
                    {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
            </div>

            <div className="modal-actions" style={{ marginTop: 0 }}>
                <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn--primary" onClick={() => onSave(form)}>
                    {initial ? 'Save changes' : 'Create reminder'}
                </button>
            </div>
        </div>
    );
}

// ─── Page ───────────────────────────────────────────────────────────
export default function Reminders() {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const motionOK = useMotionOK();
    const qc = useQueryClient();
    const toast = useToast();
    const confirm = useConfirm();

    const { data: reminders = [], isLoading } = useQuery({ queryKey: ['reminders'], queryFn: fetchReminders });
    const { data: habits = [] } = useQuery({
        queryKey: ['habits'],
        queryFn: async () => (await api.get('/habits')).data.data,
        staleTime: 60_000,
    });

    const done = (msg: string) => () => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success(msg); };

    const createMut = useMutation({
        mutationFn: createReminder,
        onSuccess: () => { setCreating(false); done('Reminder created')(); },
        onError: (e) => toast.error(errMsg(e, 'Could not create the reminder')),
    });
    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateReminder(id, data),
        onSuccess: () => { setEditing(null); done('Reminder updated')(); },
        onError: (e) => toast.error(errMsg(e, 'Could not save the reminder')),
    });
    const deleteMut = useMutation({
        mutationFn: deleteReminder,
        onSuccess: done('Reminder deleted'),
        onError: (e) => toast.error(errMsg(e, 'Could not delete the reminder')),
    });
    const toggleMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            updateReminder(id, { status: status === 'active' ? 'paused' : 'active' }),
        onSuccess: (_d, v) => done(v.status === 'active' ? 'Reminder paused' : 'Reminder resumed')(),
        onError: (e) => toast.error(errMsg(e, 'Could not update the reminder')),
    });

    const remove = async (id: string) => {
        const ok = await confirm({
            title: 'Delete reminder?',
            message: 'It stops sending and is removed for good.',
            confirmText: 'Delete',
            danger: true,
        });
        if (ok) deleteMut.mutate(id);
    };

    return (
        <div className="page page--narrow">
            <div className="page-head">
                <div>
                    <div className="eyebrow">Nudges</div>
                    <h1>Reminders</h1>
                    <p>Email that lands when you said it should</p>
                </div>
                <button className="btn btn--primary" onClick={() => setCreating(true)}>
                    <Plus size={16} /> New reminder
                </button>
            </div>

            <div className="card card--sm card--ai card--static row row--top" style={{ marginBottom: '1.5rem' }}>
                <Zap size={18} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                    <div className="t-semi" style={{ fontSize: '0.88rem' }}>How these run</div>
                    <p className="t-sm">
                        A Redis-backed cron worker sends each one. Recurring reminders reschedule themselves;
                        one-time reminders retire after they send. Leave the message blank and the AI writes it fresh each time.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <ReminderListSkeleton count={3} />
            ) : reminders.length === 0 ? (
                <div className="card empty card--static">
                    <span className="empty-art"><SilentBell /></span>
                    <h3>No reminders set</h3>
                    <p>A nudge at the right hour is often the whole difference.</p>
                    <button className="btn btn--primary" onClick={() => setCreating(true)}>
                        <Plus size={16} /> Create the first one
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
                        {reminders.map((r: any) => {
                            const s = STATUS[r.status as keyof typeof STATUS] ?? STATUS.completed;
                            return (
                                <motion.div
                                    key={r.id}
                                    layout
                                    variants={motionOK ? fadeRise : undefined}
                                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                                    transition={springs.settle}
                                    className={`card card--sm ${r.status === 'active' ? 'card--lit' : ''}`}
                                >
                                    <div className="row row--between row--top row--wrap">
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <div className="row row--wrap" style={{ gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                <span className="t-bold">{r.name}</span>
                                                <span className={`badge ${s.cls}`}>{s.label}</span>
                                                <span className="badge badge--neutral">
                                                    <Repeat size={10} /> {r.isRecurring ? 'Recurring' : 'Once'}
                                                </span>
                                            </div>

                                            <div className="row row--wrap t-sm t-dim" style={{ gap: '0.9rem' }}>
                                                <span className="row" style={{ gap: '0.3rem' }}><Mail size={12} /> {r.email}</span>
                                                <span className="row" style={{ gap: '0.3rem' }}>
                                                    <Clock size={12} /> <code className="mono t-copper">{r.schedule}</code>
                                                </span>
                                                <span className="row" style={{ gap: '0.3rem' }}><Globe size={12} /> {r.timezone}</span>
                                            </div>

                                            <div className="mono t-ash" style={{ fontSize: '0.68rem', marginTop: '0.4rem' }}>
                                                NEXT: {r.nextRunAt ? new Date(r.nextRunAt).toLocaleString() : '—'}
                                            </div>

                                            {r.message && (
                                                <p
                                                    className="t-sm"
                                                    style={{
                                                        marginTop: '0.5rem',
                                                        padding: '0.5rem 0.7rem',
                                                        background: 'var(--surface-sunk)',
                                                        borderLeft: '2px solid var(--copper)',
                                                        borderRadius: 6,
                                                    }}
                                                >
                                                    {r.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="row" style={{ gap: '0.3rem', flexShrink: 0 }}>
                                            {r.status !== 'completed' && (
                                                <button
                                                    className="btn btn--secondary btn--icon btn--sm"
                                                    onClick={() => toggleMut.mutate({ id: r.id, status: r.status })}
                                                    aria-label={r.status === 'active' ? `Pause ${r.name}` : `Resume ${r.name}`}
                                                >
                                                    {r.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                                                </button>
                                            )}
                                            <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}>
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn--danger btn--icon btn--sm" onClick={() => remove(r.id)} aria-label={`Delete ${r.name}`}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            <Modal open={creating} onClose={() => setCreating(false)} title="New reminder">
                <ReminderForm habits={habits} onClose={() => setCreating(false)} onSave={(d) => createMut.mutate(d)} />
            </Modal>

            <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit reminder">
                {editing && (
                    <ReminderForm
                        habits={habits}
                        initial={editing}
                        onClose={() => setEditing(null)}
                        onSave={(d) => updateMut.mutate({ id: editing.id, data: d })}
                    />
                )}
            </Modal>
        </div>
    );
}
