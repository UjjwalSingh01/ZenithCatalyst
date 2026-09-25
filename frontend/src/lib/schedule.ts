import { parseISO, addDays, differenceInCalendarDays, format } from 'date-fns';

/**
 * How a habit's weekdays read to a person. 0=Sunday..6=Saturday, the same
 * numbering the server and the reminder days use; empty means every day.
 *
 * Which days a habit is *due* is decided on the server (utils/schedule.ts).
 * This file only describes a schedule, so there is one answer to "is it due"
 * and it lives in one place.
 */

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* Named sets read better than lists. Compared as sorted strings, which is how
   the server stores them. */
const NAMED: Record<string, string> = {
    '0,6': 'Weekends',
    '1,2,3,4,5': 'Weekdays',
};

export function describeDays(days: number[] | null | undefined): string {
    const list = [...(days ?? [])].sort((a, b) => a - b);
    if (list.length === 0 || list.length === 7) return 'Every day';
    return NAMED[list.join(',')] ?? list.map((d) => WEEKDAYS_SHORT[d]).join(', ');
}

/**
 * Due days from `from` to `to`, both included. For a schedule this is the real
 * number of sessions left — "26 days left" on a weekend-only challenge is
 * true of the calendar and says almost nothing about the work.
 */
export function countDueDays(from: string, to: string, days: number[] | null | undefined): number {
    const span = differenceInCalendarDays(parseISO(to), parseISO(from));
    if (span < 0) return 0;
    const set = days ?? [];
    if (set.length === 0) return span + 1;
    let n = 0;
    for (let i = 0; i <= span; i++) {
        // Local midnight parse, local weekday: the date string names a day in
        // the user's calendar, so their own zone is the right one to read.
        if (set.includes(addDays(parseISO(from), i).getDay())) n++;
    }
    return n;
}

/** The next date on or after `from` that the schedule is due, or null. */
export function nextDueDay(from: string, end: string | null, days: number[] | null | undefined): string | null {
    const set = days ?? [];
    for (let i = 0; i < 7; i++) {
        const d = addDays(parseISO(from), i);
        const iso = format(d, 'yyyy-MM-dd');
        if (end && iso > end) return null;
        if (set.length === 0 || set.includes(d.getDay())) return iso;
    }
    return null;
}
