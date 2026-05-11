import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '../lib/queries';
import { Home, CheckSquare, BarChart2, Bot, Bell, Zap, Star, Flame, Trophy, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
    { to: '/app/home', icon: <Home size={20} />, label: 'Home' },
    { to: '/app/habits', icon: <CheckSquare size={20} />, label: 'Habits' },
    { to: '/app/analytics', icon: <BarChart2 size={20} />, label: 'Analytics' },
    { to: '/app/coaching', icon: <Bot size={20} />, label: 'AI Coach' },
    { to: '/app/reminders', icon: <Bell size={20} />, label: 'Reminders' },
];

export default function AppLayout() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: fetchProfile,
        staleTime: 60_000,
    });

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const xp = profile?.experiencePoints ?? 0;
    const level = profile?.level ?? 1;
    const progressToNext = xp % 100;

    return (
        <div style={{ display: 'flex', minHeight: '100dvh', position: 'relative' }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarOpen ? '240px' : '72px',
                minHeight: '100dvh',
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column',
                position: 'fixed', top: 0, left: 0, bottom: 0,
                zIndex: 30,
                transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
            }}>
                {/* Logo */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', minHeight: 72 }}>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={24} color="var(--brand-400)" />
                    </div>
                    {sidebarOpen && (
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                            Zenith Catalyst
                        </span>
                    )}
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', flexShrink: 0 }}>
                        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                {/* User XP Card */}
                {sidebarOpen && profile && (
                    <div style={{ margin: '1rem', padding: '1rem', background: 'var(--gradient-card)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                                {level}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.firstName}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--xp-gold)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <Star size={12} fill="var(--xp-gold)" /> {xp} XP · Lv {level}
                                </div>
                            </div>
                        </div>
                        <div className="progress-track" style={{ height: 4 }}>
                            <div className="progress-fill" style={{ width: `${progressToNext}%` }} />
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{progressToNext}/100 to Lv {level + 1}</div>
                    </div>
                )}

                {/* Nav */}
                <nav style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {navItems.map(({ to, icon, label }) => (
                        <NavLink key={to} to={to} style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem', borderRadius: 10,
                            fontWeight: 600, fontSize: '0.9rem',
                            textDecoration: 'none',
                            background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: isActive ? 'var(--brand-400)' : 'var(--text-secondary)',
                            border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap', overflow: 'hidden',
                        })}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {icon}
                            </div>
                            {sidebarOpen && label}
                        </NavLink>
                    ))}
                </nav>

                {/* Streak & Logout */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    {sidebarOpen && profile && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Flame size={20} color="var(--warning)" style={{ marginBottom: '0.2rem' }} />
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--warning)' }}>{profile.currentStreak}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Streak</div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: 'rgba(99,102,241,0.1)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Trophy size={20} color="var(--brand-400)" style={{ marginBottom: '0.2rem' }} />
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-400)' }}>{profile.longestStreak}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Best</div>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
                        <LogOut size={18} />
                        {sidebarOpen && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: sidebarOpen ? '240px' : '72px',
                minHeight: '100dvh',
                padding: '2rem',
                transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative', zIndex: 1,
                maxWidth: '100%',
            }}>
                <Outlet />
            </main>
        </div>
    );
}
