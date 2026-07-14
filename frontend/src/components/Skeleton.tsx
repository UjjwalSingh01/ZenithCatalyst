import React from 'react';

// A single shimmering placeholder. The shimmer sweeps copper, not grey — even
// the loading state belongs to the same fire.
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
    display: 'flex',
    flexDirection: 'column',
    gap,
});

// ─── Habit list (Habits page) ───────────────────────────────────────
export function HabitListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card card--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Skeleton width={3} height={44} radius={99} />
                    <div style={{ flex: 1, ...stack('0.55rem') }}>
                        <Skeleton width={`${55 - (i % 3) * 8}%`} height={15} />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <Skeleton width={60} height={18} radius={999} />
                            <Skeleton width={52} height={18} radius={999} />
                            <Skeleton width={70} height={18} radius={999} />
                        </div>
                    </div>
                    <Skeleton width={28} height={28} radius={8} />
                    <Skeleton width={28} height={28} radius={8} />
                </div>
            ))}
        </div>
    );
}

// ─── Reminder list ──────────────────────────────────────────────────
export function ReminderListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card card--sm" style={stack('0.7rem')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Skeleton width={130} height={17} />
                            <Skeleton width={54} height={18} radius={999} />
                            <Skeleton width={74} height={18} radius={999} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <Skeleton width={30} height={30} radius={8} />
                            <Skeleton width={30} height={30} radius={8} />
                            <Skeleton width={30} height={30} radius={8} />
                        </div>
                    </div>
                    <Skeleton width="45%" height={12} />
                    <Skeleton width="100%" height={36} radius={6} />
                </div>
            ))}
        </div>
    );
}

// ─── Day habit list (Homepage) ──────────────────────────────────────
export function DayHabitListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card card--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Skeleton width={3} height={40} radius={99} />
                    <Skeleton width={22} height={22} circle />
                    <div style={{ flex: 1, ...stack('0.4rem') }}>
                        <Skeleton width={`${60 - (i % 2) * 12}%`} height={14} />
                        <Skeleton width="35%" height={10} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Stat cards (Analytics) ─────────────────────────────────────────
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card card--sm" style={stack('0.55rem')}>
                    <Skeleton width={22} height={22} circle />
                    <Skeleton width="55%" height={26} />
                    <Skeleton width="70%" height={11} />
                </div>
            ))}
        </>
    );
}

// ─── Chart placeholder ──────────────────────────────────────────────
export function ChartSkeleton({ height = 230, title = true }: { height?: number; title?: boolean }) {
    return (
        <div className="card" style={stack('1rem')}>
            {title && <Skeleton width="40%" height={16} />}
            <Skeleton width="100%" height={height} radius={12} />
        </div>
    );
}

// ─── Text lines (Coaching) ──────────────────────────────────────────
export function TextLinesSkeleton({ lines = 4, inCard = true }: { lines?: number; inCard?: boolean }) {
    const widths = ['95%', '88%', '92%', '70%', '83%', '60%'];
    const body = (
        <div style={stack('0.6rem')}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} width={widths[i % widths.length]} height={12} />
            ))}
        </div>
    );
    return inCard ? <div className="card">{body}</div> : body;
}

// ─── Card list (Coaching insights) ──────────────────────────────────
export function CardListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={stack()}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                    <Skeleton width={34} height={34} circle />
                    <div style={{ flex: 1, ...stack('0.5rem') }}>
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
        <div style={stack('1.25rem')}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Skeleton width={84} height={84} circle />
                <div style={{ flex: 1, ...stack('0.55rem') }}>
                    <Skeleton width="40%" height={22} />
                    <Skeleton width="55%" height={13} />
                    <Skeleton width="30%" height={11} />
                </div>
            </div>
            <div className="card" style={stack('1rem')}>
                <Skeleton width="25%" height={16} />
                <Skeleton width="100%" height={6} radius={999} />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Skeleton width="100%" height={76} radius={9} />
                    <Skeleton width="100%" height={76} radius={9} />
                </div>
            </div>
            <div className="card" style={stack('1rem')}>
                <Skeleton width="20%" height={16} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: '0.75rem' }}>
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={72} radius={10} />)}
                </div>
            </div>
        </div>
    );
}
