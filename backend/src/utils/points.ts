/**
 * What a kept day is worth, by the habit's priority.
 *
 * Points are derived at read time, never stored. Two consequences worth
 * knowing: re-prioritising a habit re-scores every day it has ever had, and
 * days completed before this existed are scored too. Writing points onto
 * HabitDate would have frozen each day at whatever the priority happened to be
 * that morning, which is not what "this habit is worth more" means.
 *
 * Medium and Low deliberately share a score. The scale distinguishes what is
 * worth extra credit, and below Medium there is nothing left to take away
 * without a kept day being worth nothing at all.
 */
export const PRIORITY_POINTS: Record<number, number> = {
    1: 3, // very high
    2: 2, // high
    3: 1, // medium
    4: 1, // low
};

/** Falls back to Medium, which is what an unset priority defaults to. */
export function pointsFor(priority: number | null | undefined): number {
    return PRIORITY_POINTS[priority ?? 3] ?? 1;
}
