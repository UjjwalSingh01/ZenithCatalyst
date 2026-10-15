import { describe, it, expect } from 'vitest';
import { pointsFor, PRIORITY_POINTS } from '../points';

describe('pointsFor', () => {
    it('scores each priority level', () => {
        expect(pointsFor(1)).toBe(5);
        expect(pointsFor(2)).toBe(3);
        expect(pointsFor(3)).toBe(2);
        expect(pointsFor(4)).toBe(1);
    });

    it('falls back to Medium for unset or unknown priority', () => {
        expect(pointsFor(null)).toBe(PRIORITY_POINTS[3]);
        expect(pointsFor(undefined)).toBe(PRIORITY_POINTS[3]);
        expect(pointsFor(99)).toBe(PRIORITY_POINTS[3]);
    });

    it('scores every level differently, highest priority worth most', () => {
        const values = [1, 2, 3, 4].map(pointsFor);
        expect(new Set(values).size).toBe(4);
        expect(values).toEqual([...values].sort((a, b) => b - a));
    });
});
