import { describe, it, expect } from 'vitest';
import { weekdayOf, isDueOn, previousDueDate, hasDueDay, normaliseDays } from '../schedule';

// 2026-09-26 is a Saturday, 2026-09-27 a Sunday, 2026-09-28 a Monday.
const SAT = 6;
const SUN = 0;

describe('weekdayOf', () => {
    it('reads the weekday in UTC regardless of server zone', () => {
        expect(weekdayOf('2026-09-26')).toBe(SAT);
        expect(weekdayOf('2026-09-27')).toBe(SUN);
        expect(weekdayOf('2026-09-28')).toBe(1);
    });
});

describe('isDueOn', () => {
    const daily = { startDate: '2026-09-01', endDate: '2026-09-30', repeatDays: [] };
    const weekend = { startDate: '2026-09-01', endDate: null, repeatDays: [SAT, SUN] };

    it('is not due before start or after end', () => {
        expect(isDueOn(daily, '2026-08-31')).toBe(false);
        expect(isDueOn(daily, '2026-10-01')).toBe(false);
    });

    it('treats empty or missing repeatDays as every day', () => {
        expect(isDueOn(daily, '2026-09-15')).toBe(true);
        expect(isDueOn({ startDate: '2026-09-01', endDate: null }, '2026-09-15')).toBe(true);
    });

    it('only matches listed weekdays', () => {
        expect(isDueOn(weekend, '2026-09-26')).toBe(true);
        expect(isDueOn(weekend, '2026-09-28')).toBe(false);
    });
});

describe('previousDueDate', () => {
    it('returns calendar yesterday for a daily habit', () => {
        expect(previousDueDate({ startDate: '2026-09-01', endDate: null }, '2026-09-15')).toBe('2026-09-14');
    });

    it('skips non-due days for a weekend habit', () => {
        const weekend = { startDate: '2026-09-01', endDate: null, repeatDays: [SAT, SUN] };
        // Saturday's previous due day is last Sunday, not Friday.
        expect(previousDueDate(weekend, '2026-09-26')).toBe('2026-09-20');
        expect(previousDueDate(weekend, '2026-09-27')).toBe('2026-09-26');
    });

    it('returns null when nothing was due since start', () => {
        expect(previousDueDate({ startDate: '2026-09-15', endDate: null }, '2026-09-15')).toBeNull();
    });
});

describe('hasDueDay', () => {
    it('rejects a range that contains none of the repeat days', () => {
        // Mon 2026-09-28 to Wed 2026-09-30, Saturdays only.
        expect(hasDueDay('2026-09-28', '2026-09-30', [SAT])).toBe(false);
    });

    it('accepts a range containing a repeat day', () => {
        expect(hasDueDay('2026-09-28', '2026-10-03', [SAT])).toBe(true);
    });

    it('accepts open-ended ranges and every-day schedules', () => {
        expect(hasDueDay('2026-09-28', null, [SAT])).toBe(true);
        expect(hasDueDay('2026-09-28', '2026-09-28', [])).toBe(true);
    });
});

describe('normaliseDays', () => {
    it('sorts and de-duplicates', () => {
        expect(normaliseDays([5, 1, 5, 3])).toEqual([1, 3, 5]);
    });

    it('stores all seven days as empty (every day)', () => {
        expect(normaliseDays([0, 1, 2, 3, 4, 5, 6, 6])).toEqual([]);
    });
});
