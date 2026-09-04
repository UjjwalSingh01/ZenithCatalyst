import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth,
    isValid, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { springs, useMotionOK } from '../lib/motion';

/**
 * The month, drawn as the app draws everything else — coals on a dark ground.
 *
 * The browser's own date control is a white sheet with blue selection that
 * belongs to a different application entirely; this replaces it everywhere a
 * date is chosen. Range mode paints the days between the two ends as one
 * continuous band, so a fortnight reads as a stretch rather than two dots.
 */

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const parse = (s?: string | null) => {
    if (!s) return null;
    const d = parseISO(s);
    return isValid(d) ? d : null;
};

export default function Calendar({
    mode = 'single',
    value,
    range,
    onSelect,
    min,
    max,
}: {
    mode?: 'single' | 'range';
    value?: string | null;
    range?: { from: string | null; to: string | null };
    onSelect: (date: string) => void;
    min?: string;
    max?: string;
}) {
    const motionOK = useMotionOK();
    const anchor = parse(mode === 'range' ? range?.from : value) ?? new Date();
    const [month, setMonth] = useState(() => startOfMonth(anchor));
    const [dir, setDir] = useState(0);

    // Follow the value when it changes from outside (a preset, a cleared field).
    useEffect(() => {
        const next = parse(mode === 'range' ? range?.from : value);
        if (next) setMonth(startOfMonth(next));
    }, [mode, value, range?.from]);

    const go = (delta: number) => { setDir(delta); setMonth((m) => addMonths(m, delta)); };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    });

    const today = iso(new Date());
    const from = range?.from ?? null;
    const to = range?.to ?? null;

    const stateOf = (key: string) => {
        if (mode === 'range') {
            if (key === from || key === to) return 'edge';
            if (from && to && key > from && key < to) return 'span';
        } else if (key === value) {
            return 'edge';
        }
        return key === today ? 'today' : 'plain';
    };

    return (
        <div className="cal">
            <div className="cal-head">
                <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => go(-1)} aria-label="Previous month">
                    <ChevronLeft size={16} />
                </button>
                <div className="cal-title-wrap">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={format(month, 'yyyy-MM')}
                            className="cal-title"
                            initial={motionOK ? { opacity: 0, y: dir * 8 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: dir * -8, transition: { duration: 0.12 } }}
                            transition={springs.settle}
                        >
                            {format(month, 'MMMM yyyy')}
                        </motion.span>
                    </AnimatePresence>
                </div>
                <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => go(1)} aria-label="Next month">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="cal-week" aria-hidden>
                {WEEK.map((w) => <span key={w}>{w}</span>)}
            </div>

            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={format(month, 'yyyy-MM')}
                    className="cal-grid"
                    initial={motionOK ? { opacity: 0, x: dir * 14 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -14, transition: { duration: 0.12 } }}
                    transition={springs.settle}
                >
                    {days.map((d) => {
                        const key = iso(d);
                        const outside = !isSameMonth(d, month);
                        const blocked = (min && key < min) || (max && key > max);
                        const state = stateOf(key);

                        return (
                            <button
                                key={key}
                                type="button"
                                className="cal-day"
                                data-state={state}
                                data-outside={outside}
                                disabled={!!blocked}
                                onClick={() => onSelect(key)}
                                aria-label={format(d, 'EEEE d MMMM yyyy')}
                                aria-pressed={state === 'edge'}
                            >
                                {format(d, 'd')}
                            </button>
                        );
                    })}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
