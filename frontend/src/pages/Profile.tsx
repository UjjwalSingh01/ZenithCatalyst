import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
    fetchProfile, updateProfile, changePassword, deleteAccount, uploadAvatar, avatarUrl, logoutAllDevices, User,
} from '../lib/queries';
import { useAuth } from '../contexts/AuthContext';
import { Star, Flame, Trophy, Camera, AlertTriangle, MonitorSmartphone } from 'lucide-react';

function errMsg(err: unknown, fallback: string): string {
    const ax = err as AxiosError<{ message?: string }>;
    return ax?.response?.data?.message || fallback;
}

export default function Profile() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { refreshUser, logout } = useAuth();
    const fileRef = useRef<HTMLInputElement>(null);

    const { data: profile, isLoading } = useQuery<User>({ queryKey: ['profile'], queryFn: fetchProfile });

    if (isLoading || !profile) {
        return (
            <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 900, margin: '0 auto' }}>
                <div className="skeleton" style={{ height: 160, marginBottom: '1rem' }} />
                <div className="skeleton" style={{ height: 220 }} />
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1>Profile</h1>
                <p className="text-secondary">Manage your account, stats, and preferences</p>
            </div>

            <IdentityCard profile={profile} fileRef={fileRef} onRefresh={refreshUser} />
            <StatsCard profile={profile} />
            <BadgesCard profile={profile} />
            <EditProfileCard profile={profile} onSaved={async () => { await refreshUser(); qc.invalidateQueries({ queryKey: ['profile'] }); }} />
            <ChangePasswordCard />
            <ActiveSessionsCard onLoggedOut={async () => { await logout(); navigate('/login'); }} />
            <DangerZoneCard onDeleted={async () => { await logout(); navigate('/login'); }} />
        </div>
    );
}

// ─── Identity + avatar ─────────────────────────────────────────────
function IdentityCard({ profile, fileRef, onRefresh }: { profile: User; fileRef: React.RefObject<HTMLInputElement>; onRefresh: () => Promise<void> }) {
    const qc = useQueryClient();
    const [error, setError] = useState('');

    const avatarMut = useMutation({
        mutationFn: uploadAvatar,
        onSuccess: async () => { setError(''); await onRefresh(); qc.invalidateQueries({ queryKey: ['profile'] }); },
        onError: (err) => setError(errMsg(err, 'Failed to upload image')),
    });

    const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || profile.firstName?.[0]?.toUpperCase() || '?';
    const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', fontWeight: 700, color: '#fff',
                }}>
                    {profile.avatarUpdatedAt ? (
                        <img src={avatarUrl(profile.id, profile.avatarUpdatedAt)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : initials}
                </div>
                <button
                    className="btn btn-icon btn-sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarMut.isPending}
                    title="Change photo"
                    style={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%' }}
                >
                    <Camera size={16} />
                </button>
                <input
                    ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) avatarMut.mutate(f); e.target.value = ''; }}
                />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ marginBottom: '0.25rem' }}>{profile.firstName} {profile.lastName ?? ''}</h2>
                <p className="text-secondary" style={{ marginBottom: '0.25rem' }}>{profile.email}</p>
                <p className="text-muted text-sm">Member since {memberSince}</p>
                {avatarMut.isPending && <p className="text-muted text-sm">Uploading…</p>}
                {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
            </div>
        </div>
    );
}

// ─── Stats ─────────────────────────────────────────────────────────
function StatsCard({ profile }: { profile: User }) {
    const progressToNext = profile.experiencePoints % 100;
    return (
        <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Stats</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Star size={16} fill="var(--xp-gold)" color="var(--xp-gold)" />
                <span style={{ fontWeight: 600 }}>Level {profile.level}</span>
                <span className="text-muted text-sm">· {profile.experiencePoints} XP</span>
            </div>
            <div className="progress-track" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${progressToNext}%` }} />
            </div>
            <div className="text-muted text-xs" style={{ marginTop: '0.3rem', textAlign: 'right' }}>{progressToNext}/100 to Lv {profile.level + 1}</div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                    <Flame size={22} color="var(--warning)" />
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)' }}>{profile.currentStreak}</div>
                    <div className="text-muted text-xs">Current Streak</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: 8 }}>
                    <Trophy size={22} color="var(--brand-400)" />
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-400)' }}>{profile.longestStreak}</div>
                    <div className="text-muted text-xs">Longest Streak</div>
                </div>
            </div>
        </div>
    );
}

// ─── Badges ────────────────────────────────────────────────────────
function BadgesCard({ profile }: { profile: User }) {
    return (
        <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Badges <span className="text-muted text-sm">({profile.badges.length})</span></h3>
            {profile.badges.length === 0 ? (
                <p className="text-secondary">No badges earned yet. Keep building your habits!</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                    {profile.badges.map((b) => (
                        <div key={b.id} className="card-sm" style={{ textAlign: 'center', padding: '0.75rem' }} title={b.badge.description}>
                            <div style={{ fontSize: '1.75rem' }}>{b.badge.icon}</div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.badge.name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Edit profile ──────────────────────────────────────────────────
function EditProfileCard({ profile, onSaved }: { profile: User; onSaved: () => Promise<void> }) {
    const [firstName, setFirstName] = useState(profile.firstName);
    const [lastName, setLastName] = useState(profile.lastName ?? '');
    const [email, setEmail] = useState(profile.email);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const mut = useMutation({
        mutationFn: () => updateProfile({ firstName, lastName: lastName || null, email }),
        onSuccess: async () => { setMsg({ type: 'ok', text: 'Profile updated' }); await onSaved(); },
        onError: (err) => setMsg({ type: 'err', text: errMsg(err, 'Failed to update profile') }),
    });

    const dirty = firstName !== profile.firstName || (lastName || '') !== (profile.lastName ?? '') || email !== profile.email;

    return (
        <form
            className="card" style={{ marginBottom: '1rem' }}
            onSubmit={(e) => { e.preventDefault(); setMsg(null); mut.mutate(); }}
        >
            <h3 style={{ marginBottom: '1rem' }}>Edit Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label className="label">First Name</label>
                    <input className="input" value={firstName} maxLength={50} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                    <label className="label">Last Name</label>
                    <input className="input" value={lastName} maxLength={50} onChange={(e) => setLastName(e.target.value)} />
                </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {msg && <p className="text-sm" style={{ marginTop: '0.75rem', color: msg.type === 'ok' ? 'var(--success)' : 'var(--error)' }}>{msg.text}</p>}
            <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={!dirty || mut.isPending}>
                    {mut.isPending ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}

// ─── Change password ───────────────────────────────────────────────
function ChangePasswordCard() {
    const [currentPassword, setCurrent] = useState('');
    const [newPassword, setNew] = useState('');
    const [confirm, setConfirm] = useState('');
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const mut = useMutation({
        mutationFn: () => changePassword({ currentPassword, newPassword }),
        onSuccess: () => {
            setMsg({ type: 'ok', text: 'Password changed. Other sessions have been logged out.' });
            setCurrent(''); setNew(''); setConfirm('');
        },
        onError: (err) => setMsg({ type: 'err', text: errMsg(err, 'Failed to change password') }),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (newPassword.length < 8) { setMsg({ type: 'err', text: 'New password must be at least 8 characters' }); return; }
        if (newPassword !== confirm) { setMsg({ type: 'err', text: 'New passwords do not match' }); return; }
        mut.mutate();
    };

    return (
        <form className="card" style={{ marginBottom: '1rem' }} onSubmit={submit}>
            <h3 style={{ marginBottom: '1rem' }}>Change Password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label className="label">Current Password</label>
                    <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
                </div>
                <div>
                    <label className="label">New Password</label>
                    <input className="input" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
                </div>
                <div>
                    <label className="label">Confirm New Password</label>
                    <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
            </div>
            {msg && <p className="text-sm" style={{ marginTop: '0.75rem', color: msg.type === 'ok' ? 'var(--success)' : 'var(--error)' }}>{msg.text}</p>}
            <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={mut.isPending}>
                    {mut.isPending ? 'Updating…' : 'Update Password'}
                </button>
            </div>
        </form>
    );
}

// ─── Active sessions ───────────────────────────────────────────────
function ActiveSessionsCard({ onLoggedOut }: { onLoggedOut: () => Promise<void> }) {
    const [error, setError] = useState('');
    const mut = useMutation({
        mutationFn: logoutAllDevices,
        onSuccess: () => onLoggedOut(),
        onError: (err) => setError(errMsg(err, 'Failed to log out other devices')),
    });

    return (
        <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MonitorSmartphone size={18} /> Active Sessions
            </h3>
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
                Sign out everywhere — including this device. Use this if you've logged in on a shared or lost device.
            </p>
            <button className="btn btn-secondary" onClick={() => { setError(''); mut.mutate(); }} disabled={mut.isPending}>
                {mut.isPending ? 'Signing out…' : 'Log out all devices'}
            </button>
            {error && <p className="text-sm" style={{ marginTop: '0.75rem', color: 'var(--error)' }}>{error}</p>}
        </div>
    );
}

// ─── Danger zone ───────────────────────────────────────────────────
function DangerZoneCard({ onDeleted }: { onDeleted: () => Promise<void> }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');

    const mut = useMutation({
        mutationFn: deleteAccount,
        onSuccess: () => onDeleted(),
        onError: (err) => setError(errMsg(err, 'Failed to delete account')),
    });

    return (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.4)' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} /> Danger Zone
            </h3>
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
                Deleting your account is permanent and removes all your habits, history, and data.
            </p>
            <button className="btn btn-danger" onClick={() => { setError(''); setShowConfirm(true); }}>Delete Account</button>
            {error && <p className="text-sm" style={{ marginTop: '0.75rem', color: 'var(--error)' }}>{error}</p>}

            {showConfirm && (
                <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Delete account?</h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                            This cannot be undone. All your data will be permanently deleted.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowConfirm(false)} disabled={mut.isPending}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => mut.mutate()} disabled={mut.isPending}>
                                {mut.isPending ? 'Deleting…' : 'Yes, delete my account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
