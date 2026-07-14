import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
    Home, CheckSquare, BarChart2, Bot, Bell, User,
    Flame, Trophy, LogOut, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchProfile, avatarUrl } from '../lib/queries';
import { springs, useMotionOK } from '../lib/motion';
import Counter from './Counter';
import PageTransition from './PageTransition';
import LevelUp from './LevelUp';

const NAV = [
    { to: '/app/home', icon: Home, label: 'Today' },
    { to: '/app/habits', icon: CheckSquare, label: 'Habits' },
    { to: '/app/analytics', icon: BarChart2, label: 'Analytics' },
    { to: '/app/coaching', icon: Bot, label: 'Coach' },
    { to: '/app/reminders', icon: Bell, label: 'Reminders' },
    { to: '/app/profile', icon: User, label: 'Profile' },
];

/** The brand mark: a small fire, lit. */
function Mark({ size = 22 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
            <path
                d="M12 2c2.5 6 7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 4.5-6 7-12Z"
                fill="var(--copper)"
            />
            <path d="M12 11c1.4 2.6 3 3.3 3 5.4A3 3 0 0 1 9 16.4c0-2.1 1.6-2.8 3-5.4Z" fill="var(--gold)" />
        </svg>
    );
}

export default function AppLayout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const motionOK = useMotionOK();
    const [collapsed, setCollapsed] = useState(false);

    const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile, staleTime: 60_000 });

    const xp = profile?.experiencePoints ?? 0;
    const level = profile?.level ?? 1;
    const toNext = xp % 100;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="shell">
            {/* Lives here rather than on a page, so crossing a level celebrates
                wherever you happened to be when you completed the habit. */}
            <LevelUp level={profile?.level} />

            <motion.aside
                className="sidebar"
                data-collapsed={collapsed}
                animate={{ width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' }}
                transition={motionOK ? springs.settle : { duration: 0 }}
            >
                <div className="sidebar-head">
                    <Mark size={24} />
                    {!collapsed && <span className="brand">Zenith Catalyst</span>}
                    <button
                        className="btn btn--ghost btn--icon btn--sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                {!collapsed && profile && (
                    <Link to="/app/profile" className="xp-card">
                        <div className="row" style={{ gap: '0.6rem', marginBottom: '0.6rem' }}>
                            <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                                {profile.avatarUpdatedAt
                                    ? <img src={avatarUrl(profile.id, profile.avatarUpdatedAt)} alt="" />
                                    : level}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div className="t-semi truncate" style={{ fontSize: '0.85rem' }}>{profile.firstName}</div>
                                <div className="mono t-gold" style={{ fontSize: '0.68rem' }}>
                                    <Counter value={xp} className="mono" /> XP · LV {level}
                                </div>
                            </div>
                        </div>
                        <div className="progress-track" style={{ height: 4 }}>
                            <motion.div
                                className="progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${toNext}%` }}
                                transition={motionOK ? springs.ember : { duration: 0 }}
                            />
                        </div>
                        <div className="mono t-ash" style={{ fontSize: '0.62rem', marginTop: '0.35rem', textAlign: 'right' }}>
                            {toNext}/100 TO LV {level + 1}
                        </div>
                    </Link>
                )}

                <nav className="sidebar-nav">
                    {NAV.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} className="nav-item" title={collapsed ? label : undefined}>
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <motion.span
                                            className="nav-marker"
                                            layoutId={motionOK ? 'nav-marker' : undefined}
                                            transition={springs.settle}
                                        />
                                    )}
                                    <Icon size={19} />
                                    {!collapsed && label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-foot">
                    {!collapsed && profile && (
                        <div className="row" style={{ gap: '0.5rem', marginBottom: '0.7rem' }}>
                            <div className="tile">
                                <Flame size={17} color="var(--gold)" />
                                <span className="tile-value t-gold"><Counter value={profile.currentStreak} className="" /></span>
                                <span className="tile-label">Streak</span>
                            </div>
                            <div className="tile">
                                <Trophy size={17} color="var(--copper-lit)" />
                                <span className="tile-value t-copper"><Counter value={profile.longestStreak} className="" /></span>
                                <span className="tile-label">Best</span>
                            </div>
                        </div>
                    )}
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={handleLogout}
                        style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
                    >
                        <LogOut size={17} />
                        {!collapsed && 'Sign out'}
                    </button>
                </div>
            </motion.aside>

            <main className="main" data-collapsed={collapsed}>
                <AnimatePresence mode="wait">
                    <PageTransition key={location.pathname}>
                        <Outlet />
                    </PageTransition>
                </AnimatePresence>
            </main>

            {/* Under 900px the sidebar is gone and this is the whole nav. */}
            <nav className="rail" aria-label="Main">
                {NAV.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} className="rail-item">
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.span
                                        className="rail-marker"
                                        layoutId={motionOK ? 'rail-marker' : undefined}
                                        transition={springs.settle}
                                    />
                                )}
                                <Icon size={19} />
                                {label}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
