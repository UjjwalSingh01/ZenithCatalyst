import { motion } from 'framer-motion';
import { X, CheckCircle2, Circle, AlertCircle, ChevronDown } from 'lucide-react';
import { useHabitsByDate, useToggleHabit, useToggleSubHabit } from '../lib/hooks';
import { DayHabitListSkeleton } from './Skeleton';
import clsx from 'clsx';

interface Props {
    date: string;
    onClose: () => void;
}

/**
 * Determines the colour scheme based on completion percentage.
 * Green = 100%, Yellow→Orange = partial, Red = 0%.
 */
function getHabitColor(pct: number, hasSubHabits: boolean) {
    if (pct === 100) {
        return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Completed', Icon: CheckCircle2 };
    }
    if (pct > 0 && hasSubHabits) {
        // Gradient from yellow (low partial) to orange (higher partial)
        if (pct >= 60) {
            return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: `${pct}% Done`, Icon: AlertCircle };
        }
        return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: `${pct}% Done`, Icon: AlertCircle };
    }
    return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Not Done', Icon: Circle };
}

export default function DayDetailPanel({ date, onClose }: Props) {
    const { data: habits, isLoading } = useHabitsByDate(date);
    const toggleHabit = useToggleHabit();
    const toggleSubHabit = useToggleSubHabit();

    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    // Overall day completion
    const overallPct = habits?.length
        ? Math.round(habits.reduce((s: number, h: any) => s + (h.completionPercentage || 0), 0) / habits.length)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full lg:w-[400px] card self-start max-h-[82vh] overflow-y-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-display font-semibold text-white">{formattedDate}</h3>
                    <p className="text-xs text-dark-400 mt-0.5">{habits?.length || 0} habit{habits?.length !== 1 ? 's' : ''} &middot; {overallPct}% overall</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-dark-400 hover:text-white transition-all">
                    <X size={18} />
                </button>
            </div>

            {/* Day progress bar */}
            {habits && habits.length > 0 && (
                <div className="mb-5">
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${overallPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={clsx(
                                'h-full rounded-full',
                                overallPct >= 80 ? 'bg-emerald-500' : overallPct >= 50 ? 'bg-yellow-500' : overallPct >= 30 ? 'bg-orange-500' : 'bg-rose-500',
                            )}
                        />
                    </div>
                </div>
            )}

            {/* Habits */}
            {isLoading ? (
                <DayHabitListSkeleton count={3} />
            ) : !habits?.length ? (
                <div className="text-center py-12">
                    <Circle size={28} className="text-dark-500 mx-auto mb-3" />
                    <p className="text-dark-400 text-sm">No habits scheduled for this day</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {habits.map((habit: any) => {
                        const hasSubHabits = habit.totalSubHabits > 0;
                        const pct = habit.completionPercentage;
                        const color = getHabitColor(pct, hasSubHabits);
                        const StatusIcon = color.Icon;

                        return (
                            <motion.div
                                key={habit.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={clsx('rounded-xl p-4 border transition-all', color.bg, color.border)}
                            >
                                {/* Habit title row */}
                                <div className="flex items-start gap-3">
                                    {!hasSubHabits ? (
                                        // Binary toggle for habits without sub-habits
                                        <button
                                            onClick={() => toggleHabit.mutate({ id: habit.id, date, completed: pct !== 100 })}
                                            className={clsx('mt-0.5 transition-all hover:scale-110', color.text)}
                                        >
                                            <StatusIcon size={20} />
                                        </button>
                                    ) : (
                                        <div className={clsx('mt-0.5', color.text)}>
                                            <StatusIcon size={20} />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className={clsx('font-medium text-sm', pct === 100 ? 'line-through text-dark-400' : 'text-white')}>
                                                {habit.title}
                                            </h4>
                                            <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', color.bg, color.text)}>
                                                {color.label}
                                            </span>
                                        </div>

                                        {habit.description && (
                                            <p className="text-xs text-dark-400 mt-1 truncate">{habit.description}</p>
                                        )}

                                        {/* Sub-habits */}
                                        {hasSubHabits && (
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-dark-400">
                                                        {habit.completedSubHabits}/{habit.totalSubHabits} sub-habits
                                                    </span>
                                                    <span className={clsx('text-xs font-mono font-medium', color.text)}>
                                                        {pct}%
                                                    </span>
                                                </div>

                                                {/* Sub-habit progress bar */}
                                                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.6 }}
                                                        className={clsx(
                                                            'h-full rounded-full',
                                                            pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-yellow-400' : pct >= 30 ? 'bg-orange-400' : 'bg-rose-400',
                                                        )}
                                                    />
                                                </div>

                                                {/* Individual sub-habit checkboxes */}
                                                <div className="space-y-1.5">
                                                    {habit.subHabits.map((sh: any) => (
                                                        <button
                                                            key={sh.id}
                                                            onClick={() => toggleSubHabit.mutate({ id: sh.id, date, completed: !sh.completedToday })}
                                                            className="flex items-center gap-2.5 w-full text-left group py-0.5"
                                                        >
                                                            <div className={clsx(
                                                                'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all',
                                                                sh.completedToday
                                                                    ? 'bg-emerald-500 border-emerald-500'
                                                                    : 'border-dark-400 group-hover:border-white/50',
                                                            )}>
                                                                {sh.completedToday && (
                                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span className={clsx(
                                                                'text-xs',
                                                                sh.completedToday ? 'line-through text-dark-500' : 'text-dark-200 group-hover:text-white',
                                                            )}>
                                                                {sh.content}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
