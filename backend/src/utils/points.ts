/**
 * What a kept day is worth, by the habit's priority.
 *
 * Points are derived at read time, never stored. Two consequences worth
 * knowing: re-prioritising a habit re-scores every day it has ever had, and
 * days completed before this existed are scored too. Writing points onto
 * HabitDate would have frozen each day at whatever the priority happened to be
 * that morning, which is not what "this habit is worth more" means.
 *
 * Every level scores differently, and the gap widens toward the top: Very high
 * is worth five Lows, so one kept priority outweighs a pile of small ones.
 *
 * Mirrored for display in frontend/src/lib/priority.ts. The server is the one
 * that scores; that file only says so, and the two must agree.
 */
export const PRIORITY_POINTS: Record<number, number> = {
    1: 5, // very high
    2: 3, // high
    3: 2, // medium
    4: 1, // low
};

/** Falls back to Medium, which is what an unset priority defaults to. */
export function pointsFor(priority: number | null | undefined): number {
    return PRIORITY_POINTS[priority ?? 3] ?? PRIORITY_POINTS[3];
}
