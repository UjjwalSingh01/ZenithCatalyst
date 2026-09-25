import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useMotionOK } from '../lib/motion';

/**
 * The app's dropdown. Replaces every native <select>.
 *
 * A native select's option list is drawn by the operating system, not the
 * page: no stylesheet reaches it, so on this dark theme it opened as a bright
 * system menu that belonged to a different product. It also could not show a
 * point value, an icon or a timezone offset beside an option, and could not be
 * searched.
 *
 * Built to the WAI-ARIA "select-only combobox" pattern. Focus stays on the
 * trigger and the highlighted option is announced through
 * aria-activedescendant, which is what lets the list live in a portal (to
 * escape the modal's clipping) without focus ever leaving the field. With
 * `searchable`, focus moves into the search box instead and the same
 * attribute rides on that.
 *
 * Keys: Up/Down/Home/End/PageUp/PageDown move, Enter or Space picks, Escape
 * closes without changing anything, Tab closes, and typing a letter jumps to
 * the next option starting with it.
 */

export type SelectOption<V extends string | number> = {
    value: V;
    label: string;
    /** Secondary text on the right: a point value, a UTC offset. */
    hint?: string;
    icon?: ReactNode;
    /** Extra words the search box matches, beyond label and hint. */
    keywords?: string;
};

const EDGE = 12;
const GAP = 6;
const MAX_HEIGHT = 300;
const PAGE = 8;

type Place = { left: number; width: number; maxHeight: number; top?: number; bottom?: number; above: boolean };

export default function Select<V extends string | number>({
    id,
    labelId,
    value,
    options,
    onChange,
    placeholder = 'Choose…',
    searchable = false,
    searchPlaceholder = 'Search',
    disabled = false,
}: {
    id?: string;
    labelId?: string;
    value: V;
    options: SelectOption<V>[];
    onChange: (next: V) => void;
    placeholder?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    disabled?: boolean;
}) {
    const motionOK = useMotionOK();
    const auto = useId();
    const baseId = id ?? auto;
    const listId = `${baseId}-list`;
    const optionId = (i: number) => `${baseId}-opt-${i}`;

    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [place, setPlace] = useState<Place | null>(null);

    const typed = useRef('');
    const typedAt = useRef(0);

    // Loose equality on purpose: a value read back from a form can be "3"
    // where the option says 3, and those are the same choice.
    // eslint-disable-next-line eqeqeq
    const selectedIndex = options.findIndex((o) => o.value == value);
    const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

    /* Every word of the query must appear somewhere in the option, so
       "new york" finds America/New_York and "5:30" finds Kolkata. */
    const visible = useMemo(() => {
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length) return options;
        return options.filter((o) => {
            const hay = `${o.label} ${o.hint ?? ''} ${o.keywords ?? ''}`.toLowerCase().replace(/_/g, ' ');
            return words.every((w) => hay.includes(w));
        });
    }, [options, query]);

    const openAt = (index: number) => {
        if (disabled) return;
        setQuery('');
        setActive(Math.max(0, Math.min(options.length - 1, index)));
        setOpen(true);
    };

    const close = (refocus = true) => {
        setOpen(false);
        setQuery('');
        if (refocus) trigger.current?.focus();
    };

    const commit = (index: number) => {
        const picked = visible[index];
        if (picked) onChange(picked.value);
        close();
    };

    /* ── Placement ────────────────────────────────────────────────────
       Below the field when it fits, above when it does not. A list that
       opened downward into the bottom edge of a modal used to be clamped
       over the field it belonged to. */
    useLayoutEffect(() => {
        if (!open) return;
        const measure = () => {
            const el = trigger.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const below = vh - r.bottom - GAP - EDGE;
            const above = r.top - GAP - EDGE;
            const goUp = below < Math.min(MAX_HEIGHT, 200) && above > below;
            const width = Math.min(Math.max(r.width, 220), vw - EDGE * 2);
            const left = Math.min(Math.max(EDGE, r.left), vw - width - EDGE);
            setPlace(goUp
                ? { left, width, above: true, bottom: vh - r.top + GAP, maxHeight: Math.min(MAX_HEIGHT, above) }
                : { left, width, above: false, top: r.bottom + GAP, maxHeight: Math.min(MAX_HEIGHT, below) });
        };
        measure();
        window.addEventListener('resize', measure);
        // Capture phase, so a scrolling modal body drags the list along.
        window.addEventListener('scroll', measure, true);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [open]);

    // Close on a press anywhere else. Pressing the field itself toggles it,
    // so that is left to its own click handler.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (panel.current?.contains(t) || trigger.current?.contains(t)) return;
            close(false);
        };
        window.addEventListener('pointerdown', onDown);
        return () => window.removeEventListener('pointerdown', onDown);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep the highlighted option in view as the keyboard moves through it.
    useEffect(() => {
        if (!open) return;
        document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

    // A new query starts from its first match.
    useEffect(() => { setActive(0); }, [query]);

    /** Jump to the next option whose label starts with what was typed. */
    const typeAhead = (char: string) => {
        const now = Date.now();
        typed.current = now - typedAt.current > 600 ? char : typed.current + char;
        typedAt.current = now;
        const needle = typed.current.toLowerCase();
        const from = open ? active : selectedIndex;
        // A single repeated letter cycles through its matches; a longer string
        // searches from the current option inclusive.
        const start = needle.length === 1 ? from + 1 : Math.max(0, from);
        for (let n = 0; n < options.length; n++) {
            const i = (start + n) % options.length;
            if (options[i].label.toLowerCase().startsWith(needle)) return i;
        }
        return -1;
    };

    const onKey = (e: ReactKeyboardEvent) => {
        const last = visible.length - 1;

        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                openAt(e.key === 'ArrowUp' && selectedIndex < 0 ? options.length - 1 : Math.max(0, selectedIndex));
            } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                openAt(e.key === 'Home' ? 0 : options.length - 1);
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !searchable) {
                const i = typeAhead(e.key);
                if (i >= 0) openAt(i);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown': e.preventDefault(); setActive((a) => Math.min(last, a + 1)); return;
            case 'ArrowUp': e.preventDefault(); setActive((a) => Math.max(0, a - 1)); return;
            case 'PageDown': e.preventDefault(); setActive((a) => Math.min(last, a + PAGE)); return;
            case 'PageUp': e.preventDefault(); setActive((a) => Math.max(0, a - PAGE)); return;
            case 'Home': if (!searchable) { e.preventDefault(); setActive(0); } return;
            case 'End': if (!searchable) { e.preventDefault(); setActive(last); } return;
            case 'Enter':
                e.preventDefault();
                commit(active);
                return;
            case ' ':
                // In the search box a space is part of what is being typed.
                if (searchable) return;
                e.preventDefault();
                commit(active);
                return;
            case 'Escape':
                // Stopped here: the modal listens for Escape on window, and
                // closing a list must not also throw away the whole form.
                e.preventDefault();
                e.stopPropagation();
                close();
                return;
            case 'Tab':
                // From the search box, the next tab stop would be the end of
                // the document, so it returns to the field first.
                if (searchable) e.preventDefault();
                close(searchable);
                return;
            default:
                if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const i = typeAhead(e.key);
                    if (i >= 0) setActive(i);
                }
        }
    };

    const activeId = open && visible.length ? optionId(active) : undefined;

    return (
        <>
            <button
                ref={trigger}
                id={baseId}
                type="button"
                className="dd-trigger"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-labelledby={labelId ? `${labelId} ${baseId}` : undefined}
                aria-activedescendant={searchable ? undefined : activeId}
                data-open={open}
                disabled={disabled}
                onClick={() => (open ? close() : openAt(Math.max(0, selectedIndex)))}
                onKeyDown={onKey}
            >
                <span className="dd-value">
                    {selected?.icon && <span className="dd-icon" aria-hidden>{selected.icon}</span>}
                    <span className={`truncate ${selected ? '' : 'dd-placeholder'}`}>
                        {selected ? selected.label : placeholder}
                    </span>
                    {selected?.hint && <span className="dd-hint truncate">{selected.hint}</span>}
                </span>
                <ChevronDown className="dd-chevron" size={16} strokeWidth={2} aria-hidden />
            </button>

            {open && place && createPortal(
                <motion.div
                    ref={panel}
                    className="dd-panel"
                    data-above={place.above}
                    style={{
                        left: place.left,
                        width: place.width,
                        top: place.top,
                        bottom: place.bottom,
                        maxHeight: place.maxHeight,
                    }}
                    /* Enter only, and short: this is a form control someone is
                       in the middle of using. No exit, so closing is instant and
                       there is no presence tracking left to stall. */
                    initial={motionOK ? { opacity: 0, y: place.above ? 4 : -4, scale: 0.98 } : false}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    // Presses inside keep focus where it is, so the field or the
                    // search box never blurs mid-choice. The search box itself is
                    // exempt: it has to be able to take the caret.
                    onMouseDown={(e) => { if (e.target !== search.current) e.preventDefault(); }}
                >
                    {searchable && (
                        <div className="dd-search">
                            <Search size={14} aria-hidden />
                            {/* autoFocus rather than an effect keyed on `open`.
                                The panel only mounts once it has been placed,
                                one render after `open` flips, so an effect
                                reaching for this input found it not there yet
                                and never tried again — the box opened without
                                the caret, and typing went nowhere. */}
                            <input
                                ref={search}
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                type="text"
                                value={query}
                                placeholder={searchPlaceholder}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={onKey}
                                role="searchbox"
                                aria-label={searchPlaceholder}
                                aria-controls={listId}
                                aria-activedescendant={activeId}
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </div>
                    )}

                    <ul
                        id={listId}
                        className="dd-list"
                        role="listbox"
                        aria-labelledby={labelId}
                        tabIndex={-1}
                    >
                        {visible.map((o, i) => {
                            // eslint-disable-next-line eqeqeq
                            const isSelected = o.value == value;
                            return (
                                <li
                                    key={String(o.value)}
                                    id={optionId(i)}
                                    role="option"
                                    aria-selected={isSelected}
                                    className="dd-option"
                                    data-active={i === active}
                                    onMouseMove={() => i !== active && setActive(i)}
                                    onClick={() => commit(i)}
                                >
                                    {o.icon && <span className="dd-icon" aria-hidden>{o.icon}</span>}
                                    <span className="dd-label truncate">{o.label}</span>
                                    {o.hint && <span className="dd-hint">{o.hint}</span>}
                                    <Check className="dd-check" size={15} strokeWidth={2.5} aria-hidden />
                                </li>
                            );
                        })}
                    </ul>

                    {visible.length === 0 && (
                        <p className="dd-empty">Nothing matches “{query.trim()}”.</p>
                    )}
                </motion.div>,
                document.body,
            )}
        </>
    );
}
