import { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarRange } from 'lucide-react';
import { addDays, differenceInCalendarDays, format, isSameMonth, isValid, parseISO } from 'date-fns';
import { springs, useMotionOK } from '../lib/motion';
import Popover from './Popover';
import Calendar from './Calendar';

/**
 * The window the ledger is looking at, and the controls that move it.
 *
 * A window is an end date plus a length, which makes a preset and a
 * hand-picked range the same object — so stepping back a page works
 * identically whether you asked for 7 days or for 12 April to 3 May.
 */

const PRESETS = [7, 15, 30];
/** The server refuses more columns than this, so the picker says so first. */
export const MAX_SPAN = 62;

/** Local calendar day, not UTC — `toISOString` would hand back yesterday for
    anyone east of Greenwich in the small hours. */
export const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export function spanOf(from: string, to: string) {
    const a = parseISO(from);
    const b = parseISO(to);
    if (!isValid(a) || !isValid(b)) return NaN;
    return differenceInCalendarDays(b, a) + 1;
}

export type Win = { end: string; len: number; preset: number | null };

export function useLedgerWindow(defaultLen = 15) {
    const today = iso(new Date());
    const [win, setWin] = useState<Win>(() => ({ end: today, len: defaultLen, preset: defaultLen }));

    const from = useMemo(() => iso(addDays(parseISO(win.end), -(win.len - 1))), [win.end, win.len]);

    return { win, setWin, from, to: win.end, today, atToday: win.end >= today };
}

export default function RangeControl({ win, setWin, from, to, today, atToday }: {
    win: Win;
    setWin: (next: Win | ((w: Win) => Win)) => void;
    from: string;
    to: string;
    today: string;
    atToday: boolean;
}) {
    const motionOK = useMotionOK();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<{ from: string; to: string | null }>({ from, to });
    const chip = useRef<HTMLButtonElement>(null);

    const label = useMemo(() => {
        const a = parseISO(from);
        const b = parseISO(to);
        if (!isValid(a) || !isValid(b)) return '—';
        return isSameMonth(a, b)
            ? `${format(a, 'd')} – ${format(b, 'd MMM yyyy')}`
            : `${format(a, 'd MMM')} – ${format(b, 'd MMM yyyy')}`;
    }, [from, to]);

    const step = (dir: -1 | 1) => setWin((w) => {
        const moved = iso(addDays(parseISO(w.end), dir * w.len));
        return { ...w, end: dir > 0 && moved > today ? today : moved };
    });

    const openPanel = () => { setDraft({ from, to }); setOpen(true); };

    // Picking always starts a fresh range on the first click, then closes it
    // on the second — the usual two-tap range gesture, no mode to remember.
    const pick = (day: string) => setDraft((d) => (
        !d.to && day >= d.from ? { ...d, to: day } : { from: day, to: null }
    ));

    const len = draft.to ? spanOf(draft.from, draft.to) : NaN;
    const problem = !draft.to
        ? 'Pick the day it ends.'
        : len > MAX_SPAN
            ? `That is ${len} days — the ledger holds ${MAX_SPAN}.`
            : null;

    return (
        <div className="row" style={{ gap: '0.4rem' }}>
            <button
                className="btn btn--secondary btn--icon btn--sm"
                onClick={() => step(-1)}
                aria-label="Earlier window"
            >
                <ChevronLeft size={16} />
            </button>

            <button
                type="button"
                ref={chip}
                className="ledger-range"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => (open ? setOpen(false) : openPanel())}
            >
                <CalendarRange size={13} />
                <span className="mono">{label}</span>
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={motionOK ? springs.settle : { duration: 0 }}
                    style={{ display: 'flex' }}
                >
                    <ChevronDown size={13} />
                </motion.span>
            </button>

            <button
                className="btn btn--secondary btn--icon btn--sm"
                onClick={() => step(1)}
                disabled={atToday}
                aria-label="Later window"
            >
                <ChevronRight size={16} />
            </button>

            <button
                className={`btn btn--sm ${atToday ? 'btn--secondary' : 'btn--primary'}`}
                onClick={() => setWin((w) => ({ ...w, end: today }))}
                disabled={atToday}
            >
                Today
            </button>

            <Popover open={open} onClose={() => setOpen(false)} anchorRef={chip} width={324} label="Choose a range">
                <div className="pop-body">
                    <div className="rangepick-eyebrow">Span</div>
                    <div className="seg rangepick-seg" role="tablist" aria-label="Preset span">
                        {PRESETS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="tab"
                                className="seg-item"
                                aria-selected={win.preset === n}
                                // Changing the span keeps the window where you
                                // are rather than yanking you back to today.
                                onClick={() => { setWin((w) => ({ ...w, len: n, preset: n })); setOpen(false); }}
                            >
                                {win.preset === n && (
                                    <motion.span
                                        className="seg-marker"
                                        layoutId={motionOK ? 'ledger-span' : undefined}
                                        transition={springs.settle}
                                    />
                                )}
                                {n} days
                            </button>
                        ))}
                    </div>

                    <div className="divider--labelled">or pick two days</div>

                    <Calendar
                        mode="range"
                        range={draft}
                        onSelect={pick}
                        max={iso(addDays(new Date(), 365))}
                    />

                    <p className={`rangepick-note ${problem ? 't-copper' : 't-ash'}`}>
                        {problem ?? `${len} day${len === 1 ? '' : 's'} of ledger`}
                    </p>

                    <div className="rangepick-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={!!problem}
                            onClick={() => {
                                if (!draft.to) return;
                                setWin({ end: draft.to, len: spanOf(draft.from, draft.to), preset: null });
                                setOpen(false);
                            }}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </Popover>
        </div>
    );
}
