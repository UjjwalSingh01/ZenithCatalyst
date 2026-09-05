import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react';
import Popover from './Popover';
import Spinner from './Spinner';

const MAX = 2000;

/**
 * The note on one habit's day, edited in place against the cell it belongs to.
 *
 * A challenge is rarely the same act twice: day nine of a running challenge is
 * a different distance from day two, and the tick cannot say which. This is
 * where that goes.
 *
 * It opens as a Popover rather than a modal because writing a line about a day
 * does not deserve to take the screen, and because keeping the grid visible
 * behind it is what tells you which day you are writing about.
 */
export default function DayNote({
    open,
    onClose,
    anchorRef,
    habitTitle,
    date,
    note,
    saving,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    anchorRef: RefObject<HTMLElement | null>;
    habitTitle: string;
    date: string;
    note: string | null;
    saving: boolean;
    onSave: (next: string) => void;
}) {
    const [draft, setDraft] = useState(note ?? '');
    const area = useRef<HTMLTextAreaElement>(null);

    /* Reset to what the server has each time it opens, so a cancelled edit is
       genuinely cancelled rather than lingering in the next day you open. */
    useEffect(() => {
        if (!open) return;
        setDraft(note ?? '');
        const t = setTimeout(() => area.current?.focus(), 40);
        return () => clearTimeout(t);
    }, [open, note, date]);

    const dirty = draft.trim() !== (note ?? '').trim();

    const commit = () => {
        if (!dirty) { onClose(); return; }
        onSave(draft);
    };

    return (
        <Popover
            open={open}
            onClose={onClose}
            anchorRef={anchorRef}
            width={330}
            label={`Note for ${habitTitle} on ${date}`}
        >
            <div className="daynote">
                <div className="daynote-head">
                    <span className="daynote-title truncate">{habitTitle}</span>
                    <span className="daynote-date mono">
                        {format(parseISO(date), 'EEE d MMM')}
                    </span>
                </div>

                <textarea
                    ref={area}
                    className="textarea daynote-area"
                    value={draft}
                    maxLength={MAX}
                    placeholder="What did this day take?"
                    onChange={(e) => setDraft(e.target.value)}
                    /* Enter makes paragraphs; the shortcut has to be the one
                       that does not fight writing more than one line. */
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            commit();
                        }
                    }}
                />

                <div className="daynote-foot">
                    {note && (
                        <button
                            type="button"
                            className="btn btn--danger btn--sm btn--icon"
                            disabled={saving}
                            onClick={() => onSave('')}
                            aria-label="Delete this note"
                            title="Delete this note"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}

                    <span className="daynote-count mono" aria-hidden>
                        {draft.length}/{MAX}
                    </span>

                    <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={commit}
                        disabled={saving || !dirty}
                    >
                        {saving ? <><Spinner size={13} /> Saving</> : 'Save'}
                    </button>
                </div>
            </div>
        </Popover>
    );
}
