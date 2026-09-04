import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

/**
 * The form primitives the auth pages share.
 *
 * They exist so the accessible wiring is written once and cannot drift:
 * a label bound to its control, `aria-invalid` when the field is wrong,
 * and `aria-describedby` pointing at whichever message is actually on
 * screen. Hand-rolling that per field is where it quietly gets dropped.
 *
 * The message slot holds one thing at a time: an error replaces a hint
 * rather than stacking under it, so the line beneath a field always has
 * a single meaning. The Caps Lock notice is the one exception, because
 * it reports the keyboard rather than the value, and it is coloured as a
 * warning so it cannot be mistaken for a satisfied requirement.
 */

type Base = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    /** Marked in the UI, because the server genuinely accepts it empty. */
    optional?: boolean;
    error?: string;
    hint?: string;
    /** Renders the hint as satisfied. Used for live requirement checks. */
    hintMet?: boolean;
};

function Message({ id, error, hint, hintMet }: { id: string; error?: string; hint?: string; hintMet?: boolean }) {
    if (error) {
        return (
            <p id={id} className="field-msg field-msg--error">
                <AlertCircle size={13} strokeWidth={2} aria-hidden />
                <span>{error}</span>
            </p>
        );
    }
    if (!hint) return null;
    return (
        <p id={id} className={`field-msg ${hintMet ? 'field-msg--ok' : ''}`}>
            {hintMet && <Check size={13} strokeWidth={2.5} aria-hidden />}
            <span>{hint}</span>
        </p>
    );
}

export const FormField = forwardRef<HTMLInputElement, Base>(function FormField(
    { label, optional, error, hint, hintMet, id, className = '', ...rest },
    ref,
) {
    const auto = useId();
    const fieldId = id ?? auto;
    const msgId = `${fieldId}-msg`;
    const hasMsg = Boolean(error || hint);

    return (
        <div className="field">
            <div className="field-head">
                <label className="label" htmlFor={fieldId}>{label}</label>
                {optional && <span className="field-optional">Optional</span>}
            </div>
            <input
                {...rest}
                ref={ref}
                id={fieldId}
                className={`input ${className}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={hasMsg ? msgId : undefined}
            />
            <Message id={msgId} error={error} hint={hint} hintMet={hintMet} />
        </div>
    );
});

/**
 * A password field that can be read back.
 *
 * Hiding what you typed protects you from someone reading over your
 * shoulder, which is not the situation most people are in. Without a
 * reveal, a typo in a masked field is only discoverable by failing, and
 * on the sign-up page it is discoverable by failing twice.
 *
 * Caps Lock is called out because it is the single most common cause of
 * a password that the person is certain is correct.
 */
export const PasswordField = forwardRef<HTMLInputElement, Base>(function PasswordField(
    { label, error, hint, hintMet, id, ...rest },
    ref,
) {
    const auto = useId();
    const fieldId = id ?? auto;
    const msgId = `${fieldId}-msg`;
    const capsId = `${fieldId}-caps`;

    const [shown, setShown] = useState(false);
    const [caps, setCaps] = useState(false);

    const hasMsg = Boolean(error || hint);
    const describedBy = [hasMsg ? msgId : null, caps ? capsId : null].filter(Boolean).join(' ');

    return (
        <div className="field">
            <label className="label" htmlFor={fieldId}>{label}</label>

            <div className="input-wrap">
                <input
                    {...rest}
                    ref={ref}
                    id={fieldId}
                    type={shown ? 'text' : 'password'}
                    className="input input--has-toggle"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy || undefined}
                    onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                    onBlur={(e) => {
                        setCaps(false);
                        rest.onBlur?.(e);
                    }}
                />
                <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShown((s) => !s)}
                    /* The control is not in the tab order: it sits between the
                       password and the submit button, and a keyboard user
                       tabbing to sign in should not land on it. It stays
                       reachable by pointer and by screen-reader navigation. */
                    tabIndex={-1}
                    aria-label={shown ? 'Hide password' : 'Show password'}
                    aria-pressed={shown}
                >
                    {shown ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </button>
            </div>

            {caps && (
                <p id={capsId} className="field-msg field-msg--warn">
                    <AlertCircle size={13} strokeWidth={2} aria-hidden />
                    <span>Caps Lock is on.</span>
                </p>
            )}

            <Message id={msgId} error={error} hint={hint} hintMet={hintMet} />
        </div>
    );
});
