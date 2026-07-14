import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Flame, Trophy, Camera, AlertTriangle, MonitorSmartphone, Star } from 'lucide-react';
import {
    fetchProfile, updateProfile, changePassword, deleteAccount,
    uploadAvatar, avatarUrl, logoutAllDevices, User,
} from '../lib/queries';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { errMsg } from '../lib/errors';
import { ProfileSkeleton } from '../components/Skeleton';
import { springs, useMotionOK } from '../lib/motion';
import Counter from '../components/Counter';
import Modal from '../components/Modal';
import Reveal from '../components/Reveal';

export default function Profile() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { refreshUser, logout } = useAuth();
    const fileRef = useRef<HTMLInputElement>(null);

    const { data: profile, isLoading } = useQuery<User>({ queryKey: ['profile'], queryFn: fetchProfile });

    const head = (
        <div className="page-head">
            <div>
                <div className="eyebrow">Account</div>
                <h1>Profile</h1>
            </div>
        </div>
    );

    if (isLoading || !profile) {
        return <div className="page page--narrow">{head}<ProfileSkeleton /></div>;
    }

    return (
        <div className="page page--narrow">
            {head}
            <div className="stack stack--lg">
                <IdentityCard profile={profile} fileRef={fileRef} onRefresh={refreshUser} />
                <StatsCard profile={profile} />
                <Reveal><BadgesCard profile={profile} /></Reveal>
                <Reveal>
                    <EditProfileCard
                        profile={profile}
                        onSaved={async () => { await refreshUser(); qc.invalidateQueries({ queryKey: ['profile'] }); }}
                    />
                </Reveal>
                <Reveal><ChangePasswordCard /></Reveal>
                <Reveal><ActiveSessionsCard onLoggedOut={async () => { await logout(); navigate('/login'); }} /></Reveal>
                <Reveal><DangerZoneCard onDeleted={async () => { await logout(); navigate('/login'); }} /></Reveal>
            </div>
        </div>
    );
}

// ─── Identity ───────────────────────────────────────────────────────
function IdentityCard({ profile, fileRef, onRefresh }: {
    profile: User; fileRef: React.RefObject<HTMLInputElement>; onRefresh: () => Promise<void>;
}) {
    const qc = useQueryClient();
    const toast = useToast();

    const avatarMut = useMutation({
        mutationFn: uploadAvatar,
        onSuccess: async () => {
            await onRefresh();
            qc.invalidateQueries({ queryKey: ['profile'] });
            toast.success('Photo updated');
        },
        onError: (err) => toast.error(errMsg(err, 'Could not upload that image')),
    });

    const initials =
        `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
        || profile.firstName?.[0]?.toUpperCase()
        || '?';

    const since = new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="card row row--wrap card--static" style={{ gap: '1.5rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className="avatar" style={{ width: 84, height: 84, fontSize: '1.75rem' }}>
                    {profile.avatarUpdatedAt
                        ? <img src={avatarUrl(profile.id, profile.avatarUpdatedAt)} alt="" />
                        : initials}
                </div>
                <button
                    className="btn btn--secondary btn--icon btn--sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarMut.isPending}
                    aria-label="Change photo"
                    style={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%' }}
                >
                    <Camera size={15} />
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) avatarMut.mutate(f);
                        e.target.value = '';
                    }}
                />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ marginBottom: '0.15rem' }}>{profile.firstName} {profile.lastName ?? ''}</h2>
                <p className="t-sm">{profile.email}</p>
                <p className="mono t-ash" style={{ fontSize: '0.68rem', marginTop: '0.3rem' }}>
                    KEEPING FIRES SINCE {since.toUpperCase()}
                </p>
                {avatarMut.isPending && <p className="t-sm t-copper">Uploading…</p>}
            </div>
        </div>
    );
}

// ─── Stats ──────────────────────────────────────────────────────────
function StatsCard({ profile }: { profile: User }) {
    const motionOK = useMotionOK();
    const toNext = profile.experiencePoints % 100;

    return (
        <div className="card card--static">
            <h3 className="card-title">Standing</h3>

            <div className="row" style={{ gap: '0.45rem', marginBottom: '0.6rem' }}>
                <Star size={15} fill="var(--gold)" color="var(--gold)" />
                <span className="t-semi">Level {profile.level}</span>
                <span className="mono t-ash" style={{ fontSize: '0.72rem' }}>
                    <Counter value={profile.experiencePoints} className="mono" /> XP
                </span>
            </div>

            <div className="progress-track" style={{ height: 6 }}>
                <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${toNext}%` }}
                    transition={motionOK ? springs.ember : { duration: 0 }}
                />
            </div>
            <div className="mono t-ash" style={{ fontSize: '0.65rem', marginTop: '0.35rem', textAlign: 'right' }}>
                {toNext}/100 TO LEVEL {profile.level + 1}
            </div>

            <div className="row" style={{ gap: '0.75rem', marginTop: '1.25rem' }}>
                <div className="tile" style={{ padding: '0.85rem' }}>
                    <Flame size={20} color="var(--gold)" />
                    <span className="tile-value t-gold" style={{ fontSize: '1.35rem' }}>
                        <Counter value={profile.currentStreak} className="" />
                    </span>
                    <span className="tile-label">Current streak</span>
                </div>
                <div className="tile" style={{ padding: '0.85rem' }}>
                    <Trophy size={20} color="var(--copper-lit)" />
                    <span className="tile-value t-copper" style={{ fontSize: '1.35rem' }}>
                        <Counter value={profile.longestStreak} className="" />
                    </span>
                    <span className="tile-label">Longest ever</span>
                </div>
            </div>
        </div>
    );
}

// ─── Badges ─────────────────────────────────────────────────────────
function BadgesCard({ profile }: { profile: User }) {
    return (
        <div className="card card--static">
            <h3 className="card-title">
                Badges <span className="mono t-ash" style={{ fontSize: '0.72rem' }}>({profile.badges.length})</span>
            </h3>
            {profile.badges.length === 0 ? (
                <p className="t-sm">Nothing earned yet. Badges arrive as streaks build.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: '0.75rem' }}>
                    {profile.badges.map((b) => (
                        <div
                            key={b.id}
                            className="card--sm t-center"
                            title={b.badge.description}
                            style={{
                                padding: '0.85rem 0.5rem',
                                background: 'var(--surface-sunk)',
                                border: '1px solid var(--line)',
                                borderRadius: 'var(--radius-sm)',
                            }}
                        >
                            <div style={{ fontSize: '1.6rem' }}>{b.badge.icon}</div>
                            <div className="t-semi t-xs" style={{ marginTop: '0.2rem' }}>{b.badge.name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Edit profile ───────────────────────────────────────────────────
function EditProfileCard({ profile, onSaved }: { profile: User; onSaved: () => Promise<void> }) {
    const toast = useToast();
    const [firstName, setFirstName] = useState(profile.firstName);
    const [lastName, setLastName] = useState(profile.lastName ?? '');
    const [email, setEmail] = useState(profile.email);

    const mut = useMutation({
        mutationFn: () => updateProfile({ firstName, lastName: lastName || null, email }),
        onSuccess: async () => { toast.success('Profile updated'); await onSaved(); },
        onError: (err) => toast.error(errMsg(err, 'Could not save your profile')),
    });

    const dirty =
        firstName !== profile.firstName
        || (lastName || '') !== (profile.lastName ?? '')
        || email !== profile.email;

    return (
        <form className="card card--static" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <h3 className="card-title">Details</h3>
            <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                    <label className="label">First name</label>
                    <input className="input" value={firstName} maxLength={50} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                    <label className="label">Last name</label>
                    <input className="input" value={lastName} maxLength={50} onChange={(e) => setLastName(e.target.value)} />
                </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn--primary" disabled={!dirty || mut.isPending}>
                    {mut.isPending ? 'Saving…' : 'Save changes'}
                </button>
            </div>
        </form>
    );
}

// ─── Password ───────────────────────────────────────────────────────
function ChangePasswordCard() {
    const toast = useToast();
    const [currentPassword, setCurrent] = useState('');
    const [newPassword, setNew] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');

    const mut = useMutation({
        mutationFn: () => changePassword({ currentPassword, newPassword }),
        onSuccess: () => {
            toast.success('Password changed — other sessions signed out');
            setCurrent(''); setNew(''); setConfirm('');
        },
        onError: (err) => toast.error(errMsg(err, 'Could not change your password')),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) { setError('Use at least 8 characters.'); return; }
        if (newPassword !== confirm) { setError('Those two passwords are different.'); return; }
        mut.mutate();
    };

    return (
        <form className="card card--static" onSubmit={submit}>
            <h3 className="card-title">Password</h3>
            <div className="stack stack--lg">
                <div>
                    <label className="label">Current password</label>
                    <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
                </div>
                <div>
                    <label className="label">New password</label>
                    <input className="input" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
                </div>
                <div>
                    <label className="label">Confirm new password</label>
                    <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
            </div>
            {error && <p className="t-sm t-cinder" style={{ marginTop: '0.75rem' }}>{error}</p>}
            <div style={{ marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn--primary" disabled={mut.isPending}>
                    {mut.isPending ? 'Updating…' : 'Update password'}
                </button>
            </div>
        </form>
    );
}

// ─── Sessions ───────────────────────────────────────────────────────
function ActiveSessionsCard({ onLoggedOut }: { onLoggedOut: () => Promise<void> }) {
    const toast = useToast();
    const mut = useMutation({
        mutationFn: logoutAllDevices,
        onSuccess: () => onLoggedOut(),
        onError: (err) => toast.error(errMsg(err, 'Could not sign out the other devices')),
    });

    return (
        <div className="card card--static">
            <h3 className="card-title"><MonitorSmartphone size={17} /> Sessions</h3>
            <p className="t-sm" style={{ marginBottom: '1.25rem' }}>
                Signs you out everywhere, including here. Use it if you left yourself logged in on a device you no longer have.
            </p>
            <button className="btn btn--secondary" onClick={() => mut.mutate()} disabled={mut.isPending}>
                {mut.isPending ? 'Signing out…' : 'Sign out all devices'}
            </button>
        </div>
    );
}

// ─── Danger zone ────────────────────────────────────────────────────
function DangerZoneCard({ onDeleted }: { onDeleted: () => Promise<void> }) {
    const toast = useToast();
    const [open, setOpen] = useState(false);

    const mut = useMutation({
        mutationFn: deleteAccount,
        onSuccess: () => onDeleted(),
        onError: (err) => toast.error(errMsg(err, 'Could not delete the account')),
    });

    return (
        <div className="card card--danger card--static">
            <h3 className="card-title t-cinder"><AlertTriangle size={17} /> Delete account</h3>
            <p className="t-sm" style={{ marginBottom: '1.25rem' }}>
                Removes your habits, your history, and every fire you have kept. It cannot be undone.
            </p>
            <button className="btn btn--danger" onClick={() => setOpen(true)}>Delete account</button>

            <Modal open={open} onClose={() => setOpen(false)} width={420} danger title={<><AlertTriangle size={17} /> Delete account?</>}>
                <p className="t-dim">Everything goes, permanently. There is no way back from this one.</p>
                <div className="modal-actions">
                    <button className="btn btn--secondary" onClick={() => setOpen(false)} disabled={mut.isPending}>Cancel</button>
                    <button className="btn btn--danger" onClick={() => mut.mutate()} disabled={mut.isPending}>
                        {mut.isPending ? 'Deleting…' : 'Delete my account'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
