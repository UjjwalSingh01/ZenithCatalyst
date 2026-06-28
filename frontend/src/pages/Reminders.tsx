import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { errMsg } from '../lib/errors';

// ─── API Calls ────────────────────────────────────────────────────

async function fetchReminders() {
    const res = await api.get('/scheduler');
    return res.data.data;
}

async function createReminder(data: any) {
    const res = await api.post('/scheduler', data);
    return res.data.data;
}

async function updateReminder(id: string, data: any) {
    const res = await api.put(`/scheduler/${id}`, data);
    return res.data.data;
}

async function deleteReminder(id: string) {
    await api.delete(`/scheduler/${id}`);
}

async function validateSchedule(schedule: string) {
    const res = await api.post('/scheduler/validate', { schedule });
    return res.data.data;
}

// ─── Cron Presets ─────────────────────────────────────────────────

const PRESETS = [
    { label: 'Daily 8 AM', value: '0 8 * * *' },
    { label: 'Daily 9 PM', value: '0 21 * * *' },
    { label: 'Every Mon 9 AM', value: '0 9 * * 1' },
    { label: 'Weekdays 8 AM', value: '0 8 * * 1-5' },
    { label: 'One-time', value: 'one-time' },
    { label: 'Custom…', value: 'custom' },
];

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];

// ─── Status Badge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = { active: 'badge-success', paused: 'badge-warning', completed: 'badge-brand' };
    const icons: Record<string, string> = { active: '✅', paused: '⏸', completed: '✓' };
    return <span className={`badge ${map[status] || 'badge-brand'}`}>{icons[status]} {status}</span>;
}

// ─── Reminder Modal ───────────────────────────────────────────────

function ReminderModal({ habits, onClose, onSave, initial }: { habits: any[]; onClose: () => void; onSave: (d: any) => void; initial?: any }) {
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
        const match = PRESETS.find((p) => p.value === initial.schedule);
        return match ? initial.schedule : 'custom';
    });
    const [nextRun, setNextRun] = useState<string | null>(null);
    const [validating, setValidating] = useState(false);

    const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handlePreset = (v: string) => {
        setPreset(v);
        if (v !== 'custom') setForm((f) => ({ ...f, schedule: v, isRecurring: v !== 'one-time' }));
    };

    const checkSchedule = async () => {
        if (!form.schedule || form.schedule === 'one-time') { setNextRun('ASAP (one-time)'); return; }
        setValidating(true);
        try {
            const result = await validateSchedule(form.schedule);
            setNextRun(result.valid ? `Next: ${new Date(result.nextRun).toLocaleString()}` : 'Invalid expression');
        } catch { setNextRun('Could not validate'); }
        finally { setValidating(false); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 520 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>{initial ? 'Edit Reminder' : '⏰ New Reminder'}</h3>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="label">Name</label>
                        <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Morning Meditation Reminder" required />
                    </div>

                    <div>
                        <label className="label">Recipient Email</label>
                        <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
                    </div>

                    <div>
                        <label className="label">Message</label>
                        <textarea className="textarea" value={form.message} onChange={set('message')} placeholder="Time for your habit! Complete it now to keep your streak going." style={{ minHeight: 80 }} />
                    </div>

                    {/* Link to Habit */}
                    {habits.length > 0 && (
                        <div>
                            <label className="label">Link to Habit (optional)</label>
                            <select className="select" value={form.habitId} onChange={set('habitId')}>
                                <option value="">— None —</option>
                                {habits.map((h: any) => <option key={h.id} value={h.id}>{h.title}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Schedule Presets */}
                    <div>
                        <label className="label">Schedule</label>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            {PRESETS.map((p) => (
                                <button key={p.value} type="button" className={`btn btn-sm ${preset === p.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePreset(p.value)}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        {(preset === 'custom' || !PRESETS.find((p) => p.value === form.schedule && p.value !== 'custom')) && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="input" value={form.schedule} onChange={set('schedule')} placeholder="Cron: 0 8 * * *" />
                                <button className="btn btn-secondary btn-sm" onClick={checkSchedule} disabled={validating} style={{ flexShrink: 0 }}>
                                    {validating ? '…' : 'Check'}
                                </button>
                            </div>
                        )}
                        {nextRun && <p style={{ fontSize: '0.78rem', marginTop: '0.3rem', color: nextRun.startsWith('Invalid') ? 'var(--error)' : 'var(--success)' }}>{nextRun}</p>}
                    </div>

                    <div>
                        <label className="label">Timezone</label>
                        <select className="select" value={form.timezone} onChange={set('timezone')}>
                            {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => onSave(form)}>
                            {initial ? 'Save Changes' : 'Create Reminder'} →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function Reminders() {
    const [showModal, setShowModal] = useState(false);
    const [editReminder, setEditReminder] = useState<any>(null);
    const qc = useQueryClient();
    const toast = useToast();
    const confirm = useConfirm();

    const { data: reminders = [], isLoading } = useQuery({ queryKey: ['reminders'], queryFn: fetchReminders });
    const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: async () => { const r = await api.get('/habits'); return r.data.data; }, staleTime: 60_000 });

    const createMut = useMutation({ mutationFn: createReminder, onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); setShowModal(false); toast.success('Reminder created'); }, onError: (e) => toast.error(errMsg(e, 'Failed to create reminder')) });
    const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => updateReminder(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); setEditReminder(null); toast.success('Reminder updated'); }, onError: (e) => toast.error(errMsg(e, 'Failed to update reminder')) });
    const deleteMut = useMutation({ mutationFn: deleteReminder, onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success('Reminder deleted'); }, onError: (e) => toast.error(errMsg(e, 'Failed to delete reminder')) });
    const toggleMut = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => updateReminder(id, { status: status === 'active' ? 'paused' : 'active' }), onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['reminders'] }); toast.success(v.status === 'active' ? 'Reminder paused' : 'Reminder resumed'); }, onError: (e) => toast.error(errMsg(e, 'Failed to update reminder')) });

    const formatNext = (ts: number | null) => ts ? new Date(ts).toLocaleString() : '—';

    return (
        <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 800, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>⏰ Reminders</h1>
                    <p className="text-secondary">Schedule email reminders for your habits — powered by Redis + Cron</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Reminder</button>
            </div>

            {/* Info Banner */}
            <div className="card card-glass" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Smart Scheduling</div>
                    <p style={{ fontSize: '0.85rem' }}>Reminders run via a distributed cron worker with Redis-backed scheduling. Standard 5-field cron syntax or choose a preset. Recurring reminders auto-reschedule; one-time reminders are completed after sending.</p>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
                </div>
            ) : reminders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⏰</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No reminders yet</h3>
                    <p style={{ marginBottom: '1.5rem' }}>Set up email reminders to stay consistent with your habits</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Reminder →</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {reminders.map((r: any) => (
                        <div key={r.id} className="card card-sm" style={{ borderColor: r.status === 'active' ? 'rgba(34,197,94,0.2)' : 'var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700 }}>{r.name}</span>
                                        <StatusBadge status={r.status} />
                                        {r.isRecurring ? <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--brand-400)' }}>🔁 Recurring</span> : <span className="badge badge-warning">1× One-time</span>}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                        <span>📧 {r.email}</span>
                                        <span>⏰ <code style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>{r.schedule}</code></span>
                                        <span>🌍 {r.timezone}</span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                        Next run: {formatNext(r.nextRunAt)}
                                    </div>
                                    {r.message && <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, borderLeft: '3px solid rgba(99,102,241,0.4)' }}>{r.message}</p>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                                    {r.status !== 'completed' && (
                                        <button className={`btn btn-sm btn-icon ${r.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={() => toggleMut.mutate({ id: r.id, status: r.status })}
                                            title={r.status === 'active' ? 'Pause' : 'Resume'}>
                                            {r.status === 'active' ? '⏸' : '▶'}
                                        </button>
                                    )}
                                    <button className="btn btn-sm btn-icon btn-ghost" onClick={() => setEditReminder(r)} title="Edit">✏️</button>
                                    <button className="btn btn-sm btn-icon btn-danger" onClick={async () => { if (await confirm({ title: 'Delete reminder?', message: 'This reminder will be permanently removed.', confirmText: 'Delete', danger: true })) deleteMut.mutate(r.id); }} title="Delete">🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && <ReminderModal habits={habits} onClose={() => setShowModal(false)} onSave={(d) => createMut.mutate(d)} />}
            {editReminder && <ReminderModal habits={habits} initial={editReminder} onClose={() => setEditReminder(null)} onSave={(d) => updateMut.mutate({ id: editReminder.id, data: d })} />}
        </div>
    );
}
