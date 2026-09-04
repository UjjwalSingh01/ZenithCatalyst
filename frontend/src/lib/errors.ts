import { AxiosError } from 'axios';

// Extracts a human-readable message from an API error, falling back to a default.
export function errMsg(err: unknown, fallback: string): string {
    const ax = err as AxiosError<{ message?: string }>;
    return ax?.response?.data?.message || fallback;
}

/**
 * Per-field messages from a 422. The validate middleware sends Zod's
 * `flatten().fieldErrors`, so the shape is `{ password: ['...'] }`.
 *
 * Without this the caller can only show the envelope's own `message`,
 * which for a validation failure is the literal string "Validation
 * failed" — true, and useless to the person who has to fix it.
 */
export function fieldErrors(err: unknown): Record<string, string> {
    const ax = err as AxiosError<{ errors?: Record<string, string[]> }>;
    const raw = ax?.response?.data?.errors;
    if (!raw || typeof raw !== 'object') return {};

    const out: Record<string, string> = {};
    for (const [field, messages] of Object.entries(raw)) {
        if (Array.isArray(messages) && messages.length > 0) out[field] = messages[0];
    }
    return out;
}
