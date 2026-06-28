import React from 'react';

// ─── Primitive ──────────────────────────────────────────────────────
// A single shimmering placeholder. Uses the global `.skeleton` class
// (shimmer keyframes live in index.css).
export function Skeleton({
    width = '100%',
    height = 14,
    radius = 8,
    circle = false,
    style,
}: {
    width?: number | string;
    height?: number | string;
    radius?: number | string;
    circle?: boolean;
    style?: React.CSSProperties;
}) {
    return (
        <div
            className="skeleton"
            style={{
                width: circle ? height : width,
                height,
                borderRadius: circle ? '50%' : radius,
                flexShrink: 0,
                ...style,
            }}
        />
    );
}

const stack = (gap: number | string = '0.75rem'): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', gap,
});

// ─── Habit list (Habits page) ───────────────────────────────────────
export function HabitListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Skeleton width={4} height={44} radius={99} />
                    <div style={{ flex: 1, ...stack('0.6rem') }}>
                        <Skeleton width={`${55 - (i % 3) * 8}%`} height={16} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Skeleton width={64} height={20} radius={999} />
                            <Skeleton width={52} height={20} radius={999} />
                            <Skeleton width={72} height={20} radius={999} />
                        </div>
                    </div>
                    <Skeleton width={28} height={28} radius={8} />
                    <Skeleton width={28} height={28} radius={8} />
                </div>
            ))}
        </div>
    );
}

// ─── Reminder list (Reminders page) ─────────────────────────────────
export function ReminderListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card" style={stack('0.75rem')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Skeleton width={140} height={18} />
                            <Skeleton width={56} height={20} radius={999} />
                            <Skeleton width={76} height={20} radius={999} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Skeleton width={32} height={32} radius={8} />
                            <Skeleton width={32} height={32} radius={8} />
                            <Skeleton width={32} height={32} radius={8} />
                        </div>
                    </div>
                    <Skeleton width="45%" height={12} />
                    <Skeleton width="100%" height={40} radius={10} />
                </div>
            ))}
        </div>
    );
}

// ─── Day habit list (Homepage + DayDetailPanel) ─────────────────────
export function DayHabitListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Skeleton width={4} height={40} radius={99} />
                    <Skeleton width={22} height={22} circle />
                    <div style={{ flex: 1, ...stack('0.45rem') }}>
                        <Skeleton width={`${60 - (i % 2) * 12}%`} height={14} />
                        <Skeleton width="35%" height={10} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Stat cards grid (Analytics) ────────────────────────────────────
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', padding: '1.25rem' }}>
                    <Skeleton width={28} height={28} circle />
                    <Skeleton width="55%" height={24} />
                    <Skeleton width="70%" height={11} />
                </div>
            ))}
        </>
    );
}

// ─── Chart placeholder (Analytics) ──────────────────────────────────
export function ChartSkeleton({ height = 260, title = true }: { height?: number; title?: boolean }) {
    return (
        <div className="card" style={stack('1rem')}>
            {title && <Skeleton width="40%" height={16} />}
            <Skeleton width="100%" height={height} radius={12} />
        </div>
    );
}

// ─── Generic text lines (Coaching tabs) ─────────────────────────────
export function TextLinesSkeleton({ lines = 4, inCard = true }: { lines?: number; inCard?: boolean }) {
    const widths = ['95%', '88%', '92%', '70%', '83%', '60%'];
    const body = (
        <div style={stack('0.65rem')}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} width={widths[i % widths.length]} height={12} />
            ))}
        </div>
    );
    return inCard ? <div className="card">{body}</div> : body;
}

// ─── Card list (Coaching insights/suggestions) ──────────────────────
export function CardListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card" style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                    <Skeleton width={36} height={36} circle />
                    <div style={{ flex: 1, ...stack('0.55rem') }}>
                        <Skeleton width="50%" height={15} />
                        <Skeleton width="90%" height={11} />
                        <Skeleton width="75%" height={11} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Profile page ───────────────────────────────────────────────────
export function ProfileSkeleton() {
    return (
        <div style={stack('1rem')}>
            {/* Identity card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Skeleton width={88} height={88} circle />
                <div style={{ flex: 1, ...stack('0.6rem') }}>
                    <Skeleton width="40%" height={22} />
                    <Skeleton width="55%" height={13} />
                    <Skeleton width="30%" height={11} />
                </div>
            </div>
            {/* Stats card */}
            <div className="card" style={stack('1rem')}>
                <Skeleton width="25%" height={16} />
                <Skeleton width="100%" height={6} radius={999} />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Skeleton width="100%" height={72} radius={10} />
                    <Skeleton width="100%" height={72} radius={10} />
                </div>
            </div>
            {/* Badges card */}
            <div className="card" style={stack('1rem')}>
                <Skeleton width="20%" height={16} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={72} radius={12} />)}
                </div>
            </div>
        </div>
    );
}
