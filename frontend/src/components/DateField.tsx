import { useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import Popover from './Popover';
import Calendar from './Calendar';

/**
 * A date input that opens our own calendar instead of the browser's. The
 * native control can't be styled past its border, so on a dark ground it
 * opens a white sheet with blue selection — the one place in the app that
 * looked like a different product.
 */
export default function DateField({
    value,
    onChange,
    min,
    max,
    placeholder = 'Pick a date',
    clearable = false,
    required = false,
    id,
}: {
    value: string;
    onChange: (date: string) => void;
    min?: string;
    max?: string;
    placeholder?: string;
    clearable?: boolean;
    required?: boolean;
    id?: string;
}) {
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);

    const parsed = value ? parseISO(value) : null;
    const shown = parsed && isValid(parsed) ? format(parsed, 'd MMM yyyy') : '';

    return (
        <>
            <button
                type="button"
                id={id}
                ref={trigger}
                className="datefield"
                data-empty={!shown}
                data-invalid={required && !shown}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <CalendarDays size={15} />
                <span className="datefield-value">{shown || placeholder}</span>
                {clearable && shown && (
                    <span
                        role="button"
                        tabIndex={0}
                        className="datefield-clear"
                        aria-label="Clear date"
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(''); } }}
                    >
                        <X size={13} />
                    </span>
                )}
            </button>

            <Popover open={open} onClose={() => setOpen(false)} anchorRef={trigger} width={312} align="start" label="Choose a date">
                <div className="pop-body">
                    <Calendar
                        value={value}
                        min={min}
                        max={max}
                        onSelect={(d) => { onChange(d); setOpen(false); }}
                    />
                </div>
            </Popover>
        </>
    );
}
