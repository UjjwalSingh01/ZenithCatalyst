import { ChevronsUp, ChevronUp, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * The four priority levels, and what a kept day of each is worth.
 *
 * Ascending is more important, which is also the order the habit list sorts
 * by. `points` must match backend/src/utils/points.ts: the server does the
 * scoring, this file is how the app describes it. Everything on the frontend
 * that mentions a point value reads it from here, so no sentence elsewhere can
 * go on quoting last month's numbers.
 */
export const PRIORITY = {
    1: { icon: ChevronsUp, label: 'Very high', color: 'var(--gold)', points: 5 },
    2: { icon: ChevronUp, label: 'High', color: 'var(--copper-lit)', points: 3 },
    3: { icon: ChevronRight, label: 'Medium', color: 'var(--copper)', points: 2 },
    4: { icon: ChevronDown, label: 'Low', color: 'var(--cold)', points: 1 },
} as const;

export type PriorityKey = keyof typeof PRIORITY;

/** Medium, matching the column default and the create schema. */
export const DEFAULT_PRIORITY: PriorityKey = 3;

export const PRIORITY_KEYS = Object.keys(PRIORITY).map(Number) as PriorityKey[];

export const pointsLabel = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;

/** "5, 3, 2 or 1 point", built from the table rather than typed out. */
export function describePointScale(): string {
    const values = PRIORITY_KEYS.map((k) => PRIORITY[k].points);
    return `${values.slice(0, -1).join(', ')} or ${pointsLabel(values[values.length - 1])}`;
}
