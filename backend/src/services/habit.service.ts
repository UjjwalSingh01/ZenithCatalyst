import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/error.middleware';
import { tryAwardBadge } from './auth.service';
import { createHabitReminder, updateHabitReminder, ReminderConfig } from './scheduler.service';
import logger from '../utils/logger';

const XP_PER_COMPLETION = 10;
const XP_STREAK_BONUS = 5;

// ─── CRUD ───────────────────────────────────────────────────────────

export async function createHabit(userId: string, data: {
    title: string;
    description?: string;
    priority?: number;
    category?: string;
    tags?: string[];
    color?: string;
    startDate: string;
    endDate?: string;
    subHabits?: string[];
    aiGenerated?: boolean;
    isChallenge?: boolean;
    reminder?: ReminderConfig;
}) {
    const { subHabits, reminder, ...habitData } = data;
    const habit = await prisma.habit.create({
        data: {
            ...habitData,
            userId,
            subHabits: subHabits?.length
                ? { create: subHabits.map((content) => ({ content })) }
                : undefined,
        },
        include: { subHabits: true },
    });

    // Create email reminder if configured
    if (reminder?.enabled) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            });
            if (user) {
                await createHabitReminder(
                    userId, habit.id, reminder,
                    user.email, habit.title, data.endDate,
                );
            }
        } catch (err) {
            // Don't fail habit creation if reminder setup fails
            logger.warn({ err, habitId: habit.id }, 'Failed to create habit reminder');
        }
    }

    // Check for "Habit Starter" badge
    const habitCount = await prisma.habit.count({ where: { userId } });
    if (habitCount === 1) await tryAwardBadge(userId, 'Habit Starter');
    if (habitCount >= 5) await tryAwardBadge(userId, 'Habit Hoarder');

    return habit;
}

export async function getHabits(userId: string, includeArchived = false, onlyChallenges = false) {
    return prisma.habit.findMany({
        where: {
            userId,
            ...(includeArchived ? {} : { isArchived: false }),
            ...(onlyChallenges ? { isChallenge: true } : {}),
        },
        include: {
            subHabits: true,
            reminders: {
                where: { status: { not: 'completed' } },
                take: 1,
                select: {
                    id: true,
                    reminderFrequency: true,
                    reminderTime: true,
                    reminderDays: true,
                    endsAt: true,
                    status: true,
                    message: true,
                },
            },
        },
        // Manual order first; habits nobody has dragged all sit at 0 and
        // fall back to priority, then age.
        orderBy: [{ position: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
    });
}

export async function getHabitById(userId: string, habitId: string) {
    const habit = await prisma.habit.findFirst({
        where: { id: habitId, userId },
        include: {
            subHabits: { include: { dates: true } },
            dates: true,
            reminders: {
                where: { status: { not: 'completed' } },
                take: 1,
            },
        },
    });
    if (!habit) throw new AppError(404, 'Habit not found');
    return habit;
}

export async function updateHabit(userId: string, habitId: string, data: {
    title?: string;
    description?: string;
    priority?: number;
    category?: string;
    tags?: string[];
    color?: string;
    endDate?: string;
    isArchived?: boolean;
    isChallenge?: boolean;
    reminder?: ReminderConfig;
}) {
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) throw new AppError(404, 'Habit not found');

    // Whether the habit ends up time-boxed depends on both the payload and what
    // is already stored — clearing the end date of a challenge is as invalid as
    // promoting an open-ended habit to one.
    const willBeChallenge = data.isChallenge ?? habit.isChallenge;
    const willEnd = data.endDate !== undefined ? data.endDate : habit.endDate;
    if (willBeChallenge && !willEnd) {
        throw new AppError(400, 'A challenge needs an end date');
    }

    const { reminder, ...updateData } = data;

    const updated = await prisma.habit.update({
        where: { id: habitId },
        data: updateData,
        include: { subHabits: true },
    });

    // Handle reminder config update
    if (reminder !== undefined) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            });
            if (user) {
                await updateHabitReminder(
                    userId, habitId, reminder,
                    user.email, updated.title,
                    data.endDate ?? habit.endDate,
                );
            }
        } catch (err) {
            logger.warn({ err, habitId }, 'Failed to update habit reminder');
        }
    }

    return updated;
}

/**
 * Writes the order the user dragged a list into.
 *
 * The payload is usually a *subset* — the habits page under a category
 * filter, or the challenge ledger, which only ever shows challenges. So the
 * given sequence is spliced into the slots those habits already occupy in the
 * full list, leaving everything the user could not see exactly where it was.
 * Numbering only the ids that were sent would hand positions 0..3 to four
 * challenges and collide them with everything else.
 *
 * Positions are then rewritten across the whole list rather than patched, so
 * it can never drift into duplicate or stale values however often it is
 * dragged, and unknown or someone else's ids are dropped rather than trusted.
 */
export async function reorderHabits(userId: string, ids: string[]) {
    const all = await prisma.habit.findMany({
        where: { userId },
        select: { id: true },
        orderBy: [{ position: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
    });

    const owned = new Set(all.map((h) => h.id));
    const sequence = ids.filter((id) => owned.has(id));
    const moving = new Set(sequence);

    let next = 0;
    const ordered = all.map((h) => (moving.has(h.id) ? sequence[next++] : h.id));

    await prisma.$transaction(
        ordered.map((id, index) => prisma.habit.updateMany({
            where: { id, userId },
            data: { position: index },
        })),
    );
}

export async function deleteHabit(userId: string, habitId: string) {
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) throw new AppError(404, 'Habit not found');
    // Cascading delete will also remove related ScheduledTasks via FK onDelete: Cascade
    await prisma.habit.delete({ where: { id: habitId } });
}

// ─── Completion Tracking ────────────────────────────────────────────

export async function toggleHabitDate(userId: string, habitId: string, date: string, completed: boolean) {
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) throw new AppError(404, 'Habit not found');

    const xp = completed ? XP_PER_COMPLETION : 0;

    const habitDate = await prisma.habitDate.upsert({
        where: { habitId_date: { habitId, date } },
        create: { habitId, date, completed, xpAwarded: xp },
        update: { completed, xpAwarded: xp },
    });

    if (completed) {
        await _updateUserGamification(userId, habitId, date, xp);
    }

    return habitDate;
}

export async function toggleSubHabitDate(userId: string, subHabitId: string, date: string, completed: boolean) {
    const subHabit = await prisma.subHabit.findFirst({
        where: { id: subHabitId, habit: { userId } },
        include: { habit: true },
    });
    if (!subHabit) throw new AppError(404, 'Sub-habit not found');

    const result = await prisma.subHabitDate.upsert({
        where: { subHabitId_date: { subHabitId, date } },
        create: { subHabitId, date, completed },
        update: { completed },
    });

    // Check if ALL sub-habits are done for this habit on this date
    const allSubs = await prisma.subHabit.findMany({
        where: { habitId: subHabit.habitId },
        include: { dates: { where: { date } } },
    });
    const allDone = allSubs.every((sh) => sh.dates.some((d) => d.completed));

    await prisma.habitDate.upsert({
        where: { habitId_date: { habitId: subHabit.habitId, date } },
        create: { habitId: subHabit.habitId, date, completed: allDone, xpAwarded: allDone ? XP_PER_COMPLETION : 0 },
        update: { completed: allDone, xpAwarded: allDone ? XP_PER_COMPLETION : 0 },
    });

    if (allDone) {
        await _updateUserGamification(userId, subHabit.habitId, date, XP_PER_COMPLETION);
    }

    return result;
}

// ─── Day View ────────────────────────────────────────────────────────

export async function getHabitsForDate(userId: string, date: string) {
    const habits = await prisma.habit.findMany({
        where: {
            userId,
            isArchived: false,
            startDate: { lte: date },
            OR: [{ endDate: null }, { endDate: { gte: date } }],
        },
        include: {
            subHabits: {
                include: { dates: { where: { date } } },
            },
            dates: { where: { date } },
        },
        orderBy: [{ position: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
    });

    return habits.map((h) => {
        const completed = h.dates[0]?.completed ?? false;
        const subHabits = h.subHabits.map((sh) => ({
            id: sh.id,
            content: sh.content,
            completed: sh.dates[0]?.completed ?? false,
        }));
        const progress = h.subHabits.length > 0
            ? subHabits.filter((s) => s.completed).length / h.subHabits.length
            : completed ? 1 : 0;

        return { ...h, completed, subHabits, progress };
    });
}

// ─── Gamification Internal ──────────────────────────────────────────

async function _updateUserGamification(userId: string, habitId: string, date: string, xpGained: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Calculate streak bonus
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const yesterdayComplete = await prisma.habitDate.findFirst({ where: { habitId, date: yStr, completed: true } });
    const streakBonus = yesterdayComplete ? XP_STREAK_BONUS : 0;

    const totalXp = user.experiencePoints + xpGained + streakBonus;
    const newLevel = Math.floor(totalXp / 100) + 1;
    const newStreak = yesterdayComplete ? user.currentStreak + 1 : 1;
    const longestStreak = Math.max(user.longestStreak, newStreak);

    await prisma.user.update({
        where: { id: userId },
        data: {
            experiencePoints: totalXp,
            level: newLevel,
            currentStreak: newStreak,
            longestStreak,
        },
    });

    // Badge checks
    if (newStreak >= 3) await tryAwardBadge(userId, 'On a Roll');
    if (newStreak >= 7) await tryAwardBadge(userId, 'Week Warrior');
    if (newStreak >= 30) await tryAwardBadge(userId, 'Month Master');
    if (totalXp >= 100) await tryAwardBadge(userId, 'Centurion');
    if (totalXp >= 1000) await tryAwardBadge(userId, 'Legend');
}
