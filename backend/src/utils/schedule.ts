/**
 * Whether a habit is due on a given day.
 *
 * This is the only place that question is answered. The Today list, the
 * challenge ledger, the streak and the coach's context each used to decide it
 * for themselves from the date range alone, which was fine while "in range"
 * meant "due". A habit that only runs at weekends breaks that assumption, and a
 * copy that forgets the weekday check does not fail loudly — it just marks
 * every Tuesday as missed.
 */

type Schedule = {
    startDate: string;
    endDate: string | null;
    repeatDays?: number[] | null;
};

/**
 * The weekday of an ISO "YYYY-MM-DD", 0=Sunday.
 *
 * Built in UTC on purpose. `new Date('2026-09-26').getDay()` reads the result
 * in the server's local zone, and anywhere west of UTC that is the evening
 * before — so a Saturday habit would have been due on Fridays.
 */
export function weekdayOf(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** An empty list means every day. */
export function isDueOn(h: Schedule, date: string): boolean {
    if (date < h.startDate) return false;
    if (h.endDate && date > h.endDate) return false;
    const days = h.repeatDays ?? [];
    return days.length === 0 || days.includes(weekdayOf(date));
}

function shift(date: string, by: number): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10);
}

/**
 * The most recent day before `date` on which the habit was due, or null if
 * there is none since it started.
 *
 * The streak used to ask about calendar yesterday. For a Saturday-and-Sunday
 * habit, Saturday's yesterday is a Friday it was never due on, so keeping it
 * every single weekend would still have reset the streak every Saturday.
 */
export function previousDueDate(h: Schedule, date: string): string | null {
    // A week back is enough: any non-empty weekday set recurs within seven.
    for (let back = 1; back <= 7; back++) {
        const candidate = shift(date, -back);
        if (candidate < h.startDate) return null;
        if (isDueOn(h, candidate)) return candidate;
    }
    return null;
}

/**
 * True when at least one due day falls between start and end. A challenge set
 * to Saturdays that runs Monday to Wednesday would otherwise be accepted and
 * then have nothing in it to keep.
 */
export function hasDueDay(startDate: string, endDate: string | null | undefined, repeatDays: number[]): boolean {
    if (!endDate || repeatDays.length === 0) return true;
    for (let i = 0; i < 7; i++) {
        const day = shift(startDate, i);
        if (day > endDate) return false;
        if (repeatDays.includes(weekdayOf(day))) return true;
    }
    return true;
}

/**
 * One representation per schedule: sorted, no repeats, and all seven days
 * stored as empty, so "every day" can never exist in two forms.
 */
export function normaliseDays(days: number[]): number[] {
    const unique = [...new Set(days)].sort((a, b) => a - b);
    return unique.length === 7 ? [] : unique;
}
