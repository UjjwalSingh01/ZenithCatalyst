import { prisma } from '../utils/prisma';
import { pointsFor } from '../utils/points';

export async function getAnalytics(userId: string, range: string) {
    const days = rangeToDays(range);
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    const habits = await prisma.habit.findMany({
        where: {
            userId, isArchived: false,
            startDate: { lte: toStr },
            OR: [{ endDate: null }, { endDate: { gte: fromStr } }],
        },
        include: {
            dates: { where: { date: { gte: fromStr, lte: toStr } } },
        },
    });

    // Build daily completion rate timeline
    const dailyMap = new Map<string, { total: number; completed: number }>();
    for (let d = 0; d < days; d++) {
        const dt = new Date(from);
        dt.setDate(dt.getDate() + d);
        const ds = dt.toISOString().split('T')[0];
        dailyMap.set(ds, { total: 0, completed: 0 });
    }

    for (const habit of habits) {
        for (const hd of habit.dates) {
            const entry = dailyMap.get(hd.date);
            if (entry) {
                entry.total++;
                if (hd.completed) entry.completed++;
            }
        }
    }

    const timeline = Array.from(dailyMap.entries()).map(([date, v]) => ({
        date,
        completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
        completed: v.completed,
        total: v.total,
    }));

    // Per-habit stats
    const habitStats = habits.map((h) => {
        const completed = h.dates.filter((d) => d.completed).length;
        const total = h.dates.length;
        return {
            id: h.id,
            title: h.title,
            category: h.category ?? 'Other',
            color: h.color,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            completedDays: completed,
            totalDays: total,
        };
    });

    // Category distribution
    const catMap = new Map<string, number>();
    for (const h of habitStats) {
        catMap.set(h.category, (catMap.get(h.category) ?? 0) + 1);
    }
    const categories = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));

    // Overall stats
    const totalCompleted = habitStats.reduce((s, h) => s + h.completedDays, 0);
    const totalPossible = habitStats.reduce((s, h) => s + h.totalDays, 0);

    return {
        timeline,
        habitStats,
        categories,
        summary: {
            overallRate: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
            totalHabits: habits.length,
            totalCompleted,
            totalPossible,
        },
    };
}

export async function getMoodCorrelation(userId: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fromStr = ninetyDaysAgo.toISOString().split('T')[0];

    const [moodLogs, habitDates] = await Promise.all([
        prisma.moodLog.findMany({ where: { userId, date: { gte: fromStr } }, orderBy: { date: 'asc' } }),
        prisma.habitDate.findMany({
            where: { habit: { userId }, date: { gte: fromStr } },
            include: { habit: { select: { title: true } } },
        }),
    ]);

    // Build date → mood map
    const moodByDate = new Map(moodLogs.map((m) => [m.date, { mood: m.mood, energy: m.energy }]));

    // Correlation data points
    const correlation = moodLogs.map((m) => {
        const dayHabits = habitDates.filter((hd) => hd.date === m.date);
        const completedCount = dayHabits.filter((hd) => hd.completed).length;
        const rate = dayHabits.length > 0 ? Math.round((completedCount / dayHabits.length) * 100) : 0;
        return { date: m.date, mood: m.mood, energy: m.energy, completionRate: rate };
    });

    return { correlation, moodLogs };
}

/**
 * The habit × day grid for one window of dates — the ledger view.
 *
 * `getAnalytics` only ever reports aggregates, so it cannot answer "which day
 * did I drop this one?". This returns a mark per habit per day instead, and
 * the marks distinguish four different silences: a day the habit wasn't on
 * the plan yet, a day still ahead, today (still open), and a day genuinely
 * let go. Lumping those together would read as failure for days nobody had a
 * chance to keep.
 */
export type GridMark = 'done' | 'missed' | 'open' | 'future' | 'off';

export async function getHabitGrid(userId: string, from: string, to: string) {
    const dates = eachDay(from, to);
    const today = new Date().toISOString().split('T')[0];

    const [habits, user] = await Promise.all([
        prisma.habit.findMany({
            // The ledger is the challenges' page — ordinary habits are kept in
            // the charts, and mixing them here would bury the commitments.
            where: {
                userId, isArchived: false, isChallenge: true,
                startDate: { lte: to },
                OR: [{ endDate: null }, { endDate: { gte: from } }],
            },
            include: { dates: { where: { date: { gte: from, lte: to } } } },
            orderBy: [{ position: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { currentStreak: true, longestStreak: true },
        }),
    ]);

    // Per-day totals, accumulated as we walk each habit's row. `points` is what
    // was earned; `pointsPossible` is what was on the table, so the gap between
    // them is what a day cost.
    const dayTally = new Map(
        dates.map((d) => [d, { completed: 0, total: 0, points: 0, pointsPossible: 0 }]),
    );

    const rows = habits.map((h) => {
        const byDate = new Map(h.dates.map((d) => [d.date, d.completed]));
        // Notes ride alongside the marks rather than inside them: a day can
        // carry a note at any mark, including one that went out.
        const byNote = new Map(
            h.dates.filter((d) => d.note).map((d) => [d.date, d.note as string]),
        );
        let done = 0;
        let missed = 0;
        let elapsed = 0; // on-plan days that have already had their chance

        // What one kept day of this habit is worth. Same for every day of it,
        // so it is read once per row rather than per cell.
        const worth = pointsFor(h.priority);

        const marks: GridMark[] = dates.map((date) => {
            const onPlan = date >= h.startDate && (!h.endDate || date <= h.endDate);
            if (!onPlan) return 'off';
            const t = dayTally.get(date)!;
            if (byDate.get(date)) {
                done++;
                elapsed++;
                t.completed++; t.total++;
                t.points += worth; t.pointsPossible += worth;
                return 'done';
            }
            if (date > today) return 'future';
            if (date === today) {
                // Today counts toward the day's denominator so the chart reads
                // as "so far today" and climbs — but never toward `missed`,
                // which would score a day still in progress as a failure. Its
                // points are on the table without having been won yet.
                t.total++;
                t.pointsPossible += worth;
                return 'open';
            }
            missed++;
            elapsed++;
            t.total++;
            t.pointsPossible += worth;
            return 'missed';
        });

        return {
            id: h.id,
            title: h.title,
            description: h.description,
            category: h.category ?? 'Other',
            color: h.color,
            startDate: h.startDate,
            endDate: h.endDate,
            marks,
            // Same length and order as `marks`, so the row reads by index.
            notes: dates.map((date) => byNote.get(date) ?? null),
            completed: done,
            missed,
            // Rate is measured against days that actually elapsed, so a habit
            // started mid-window isn't punished for the days before it existed.
            completionRate: elapsed > 0 ? Math.round((done / elapsed) * 100) : 0,
        };
    });

    const timeline = dates.map((date) => {
        const t = dayTally.get(date)!;
        return {
            date,
            completed: t.completed,
            total: t.total,
            points: t.points,
            pointsPossible: t.pointsPossible,
            completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
        };
    });

    const completed = rows.reduce((s, r) => s + r.completed, 0);
    const missed = rows.reduce((s, r) => s + r.missed, 0);
    // Summed from the day tallies rather than the rows, so the header figure
    // and the chart can never disagree about the same window.
    const points = timeline.reduce((s, t) => s + t.points, 0);
    const pointsPossible = timeline.reduce((s, t) => s + t.pointsPossible, 0);

    return {
        from, to, dates, habits: rows, timeline,
        summary: {
            overallRate: completed + missed > 0 ? Math.round((completed / (completed + missed)) * 100) : 0,
            completed,
            missed,
            points,
            pointsPossible,
            totalHabits: rows.length,
            currentStreak: user?.currentStreak ?? 0,
            longestStreak: user?.longestStreak ?? 0,
        },
    };
}

export async function upsertMoodLog(userId: string, date: string, mood: number, energy: number, note?: string) {
    return prisma.moodLog.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, mood, energy, note },
        update: { mood, energy, note },
    });
}

/** Inclusive list of "YYYY-MM-DD" between two dates. Capped so a hand-typed
    query string can't ask for a decade's worth of columns. */
function eachDay(from: string, to: string, max = 62): string[] {
    const DAY = 86_400_000;
    const end = Date.parse(`${to}T00:00:00.000Z`);
    let cursor = Date.parse(`${from}T00:00:00.000Z`);
    const out: string[] = [];
    while (cursor <= end && out.length < max) {
        out.push(new Date(cursor).toISOString().split('T')[0]);
        cursor += DAY;
    }
    return out;
}

function rangeToDays(range: string): number {
    switch (range) {
        case 'week': return 7;
        case 'month': return 30;
        case 'year': return 365;
        default: return 30;
    }
}
