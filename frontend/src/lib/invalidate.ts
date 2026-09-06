import type { QueryClient } from '@tanstack/react-query';

/**
 * Everything a habit or a completion can change.
 *
 * The same habit is read by five different caches under five different keys,
 * and every one of them goes out of date the moment one is written. Each call
 * site used to list the keys it happened to remember, so whichever it forgot
 * stayed stale until the page was reloaded: marking a habit as a challenge
 * never reached the ledger, and ticking a day on Today never reached either.
 *
 * Listing them in one place is the point. A new cache is added here once,
 * rather than in however many mutations happen to affect it.
 *
 * These are key prefixes, so they match every variant underneath:
 * `['habits']` also clears `['habits', 'challenges']`, and `['habit-grid']`
 * clears every window that has been looked at. Note that `habits-day` is a
 * separate entry rather than a child of `habits` — a prefix match compares
 * whole segments, and `'habits-day'` is not `'habits'`.
 */
const HABIT_DERIVED: string[][] = [
    ['habits'],      // the habit list, and the challenge subset under it
    ['habits-day'],  // Today's list, keyed by date
    ['habit-grid'],  // the challenge ledger, keyed by window
    ['analytics'],   // the charts, keyed by range
    ['profile'],     // XP, level and streaks, which completions move
];

/**
 * Marks every habit-derived cache stale after a write.
 *
 * Mounted queries refetch at once; the rest refetch when they are next shown,
 * which is what makes navigating to a page you have already visited show the
 * change instead of the version you left behind. Deliberately not
 * `refetchType: 'all'` — that would fire a request for every cached range and
 * window on each tick, and ticking is the most frequent action in the app.
 */
export function invalidateHabitData(qc: QueryClient) {
    return Promise.all(HABIT_DERIVED.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

/**
 * The narrower case: something moved rows or changed a day's note, without
 * touching whether anything was completed. Progress and streaks cannot have
 * changed, so their caches are left alone.
 */
export function invalidateHabitShape(qc: QueryClient) {
    return Promise.all(
        [['habits'], ['habit-grid']].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );
}
