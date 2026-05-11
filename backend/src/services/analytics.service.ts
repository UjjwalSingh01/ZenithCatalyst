import { prisma } from '../utils/prisma';

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

export async function upsertMoodLog(userId: string, date: string, mood: number, energy: number, note?: string) {
    return prisma.moodLog.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, mood, energy, note },
        update: { mood, energy, note },
    });
}

function rangeToDays(range: string): number {
    switch (range) {
        case 'week': return 7;
        case 'month': return 30;
        case 'year': return 365;
        default: return 30;
    }
}
