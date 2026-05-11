import { prisma } from '../utils/prisma';
import {
    getRedis, TASK_KEY, USER_TASKS_KEY,
    addTaskToDueSet, removeTaskFromDueSet, updateTaskDueTime,
} from '../utils/redis';
import { AppError } from '../middlewares/error.middleware';
import { Cron } from 'croner';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────

export type ReminderFrequency = 'daily' | 'weekdays' | 'weekly' | 'custom' | 'once';
export type ReminderDuration = 'forever' | '1week' | '2weeks' | '1month' | '3months' | 'until_end';

export interface ReminderConfig {
    enabled: boolean;
    frequency: ReminderFrequency;
    time: string;       // "HH:mm"
    days?: number[];     // 0=Sun..6=Sat (for custom frequency)
    duration?: ReminderDuration;
    message?: string;
}

export interface TaskRedisData {
    id: string;
    userId: string;
    name: string;
    email: string;
    message: string;
    schedule: string;
    isRecurring: string;
    timezone: string;
    status: string;
    nextRunAt: string;
    habitId?: string;
    endsAt?: string;
}

// ─── Frequency → Cron Helpers ─────────────────────────────────────

/**
 * Convert user-friendly frequency + time + days into a standard 5-field cron expression.
 */
export function frequencyToCron(frequency: ReminderFrequency, time: string, days?: number[]): string {
    const [hour, minute] = time.split(':').map(Number);

    switch (frequency) {
        case 'daily':
            return `${minute} ${hour} * * *`;
        case 'weekdays':
            return `${minute} ${hour} * * 1-5`;
        case 'weekly':
            // Default to Monday if no days specified
            return `${minute} ${hour} * * 1`;
        case 'custom':
            if (days && days.length > 0) {
                return `${minute} ${hour} * * ${days.join(',')}`;
            }
            return `${minute} ${hour} * * *`; // fallback to daily
        case 'once':
            return 'one-time';
        default:
            return `${minute} ${hour} * * *`;
    }
}

/**
 * Calculate endsAt date from a duration string.
 */
export function computeEndsAt(duration: ReminderDuration | undefined, habitEndDate?: string | null): Date | null {
    const now = new Date();

    switch (duration) {
        case '1week':
            return new Date(now.getTime() + 7 * 86400000);
        case '2weeks':
            return new Date(now.getTime() + 14 * 86400000);
        case '1month':
            return new Date(now.getTime() + 30 * 86400000);
        case '3months':
            return new Date(now.getTime() + 90 * 86400000);
        case 'until_end':
            return habitEndDate ? new Date(habitEndDate) : null;
        case 'forever':
        default:
            return null;
    }
}

// ─── Validation ───────────────────────────────────────────────────

export function validateCronExpression(expr: string): boolean {
    if (expr === 'one-time') return true;
    try {
        new Cron(expr); // croner throws on invalid expression
        return true;
    } catch {
        return false;
    }
}

export function computeNextRun(schedule: string, timezone = 'UTC'): number {
    if (schedule === 'one-time') return Date.now(); // run ASAP
    try {
        const job = new Cron(schedule, { timezone });
        const next = job.nextRun();
        return next ? next.getTime() : Date.now() + 86400000;
    } catch {
        return Date.now() + 86400000;
    }
}

// ─── Redis Data Helpers ───────────────────────────────────────────

function flattenForRedis(data: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) result[k] = String(v);
    }
    return result;
}

async function storeTaskInRedis(task: {
    id: string;
    userId: string;
    name: string;
    email: string;
    message: string;
    schedule: string;
    isRecurring: boolean;
    timezone: string;
    habitId?: string | null;
    endsAt?: Date | null;
}): Promise<number> {
    const redis = getRedis();
    const nextRunAt = computeNextRun(task.schedule, task.timezone);

    const redisData: Record<string, unknown> = {
        id: task.id,
        userId: task.userId,
        name: task.name,
        email: task.email,
        message: task.message,
        schedule: task.schedule,
        isRecurring: task.isRecurring,
        timezone: task.timezone,
        status: 'active',
        nextRunAt,
    };

    if (task.habitId) redisData.habitId = task.habitId;
    if (task.endsAt) redisData.endsAt = task.endsAt.getTime();

    await redis.hset(TASK_KEY(task.id), flattenForRedis(redisData));
    await redis.sadd(USER_TASKS_KEY(task.userId), task.id);
    await addTaskToDueSet(task.id, nextRunAt);

    return nextRunAt;
}

// ─── Habit-Linked Reminder CRUD ───────────────────────────────────

/**
 * Create a reminder linked to a habit during habit creation/editing.
 */
export async function createHabitReminder(
    userId: string,
    habitId: string,
    config: ReminderConfig,
    userEmail: string,
    habitTitle: string,
    habitEndDate?: string | null,
): Promise<void> {
    const schedule = frequencyToCron(config.frequency, config.time, config.days);

    if (!validateCronExpression(schedule)) {
        throw new AppError(422, `Invalid schedule generated from frequency: ${config.frequency}`);
    }

    const endsAt = computeEndsAt(config.duration, habitEndDate);
    const message = config.message || `Time for your habit: ${habitTitle}! Stay consistent and keep your streak going.`;

    const task = await prisma.scheduledTask.create({
        data: {
            userId,
            habitId,
            name: `Reminder: ${habitTitle}`,
            email: userEmail,
            message,
            schedule,
            isRecurring: config.frequency !== 'once',
            timezone: 'UTC',
            reminderFrequency: config.frequency,
            reminderTime: config.time,
            reminderDays: config.days ?? [],
            endsAt,
        },
    });

    const nextRunAt = await storeTaskInRedis(task);
    logger.info({ taskId: task.id, habitId, nextRunAt: new Date(nextRunAt).toISOString() }, 'Habit reminder created');
}

/**
 * Get the reminder config for a specific habit.
 */
export async function getHabitReminder(habitId: string): Promise<ReminderConfig | null> {
    const task = await prisma.scheduledTask.findFirst({
        where: { habitId, status: { not: 'completed' } },
        orderBy: { createdAt: 'desc' },
    });

    if (!task) return null;

    return {
        enabled: true,
        frequency: (task.reminderFrequency as ReminderFrequency) || 'daily',
        time: task.reminderTime || '08:00',
        days: task.reminderDays,
        message: task.message,
    };
}

/**
 * Update or recreate reminders for a habit when editing.
 */
export async function updateHabitReminder(
    userId: string,
    habitId: string,
    config: ReminderConfig,
    userEmail: string,
    habitTitle: string,
    habitEndDate?: string | null,
): Promise<void> {
    // Delete existing reminders for this habit
    await deleteHabitReminders(habitId, userId);

    if (config.enabled) {
        await createHabitReminder(userId, habitId, config, userEmail, habitTitle, habitEndDate);
    }
}

/**
 * Delete all reminders linked to a habit.
 */
export async function deleteHabitReminders(habitId: string, userId: string): Promise<void> {
    const tasks = await prisma.scheduledTask.findMany({
        where: { habitId },
    });

    if (tasks.length === 0) return;

    const redis = getRedis();
    for (const task of tasks) {
        await redis.del(TASK_KEY(task.id));
        await redis.srem(USER_TASKS_KEY(userId), task.id);
        await removeTaskFromDueSet(task.id);
    }

    await prisma.scheduledTask.deleteMany({ where: { habitId } });
    logger.info({ habitId, count: tasks.length }, 'Habit reminders deleted');
}

// ─── Generic Task CRUD (for standalone reminders) ─────────────────

export async function createTask(userId: string, data: {
    name: string;
    email: string;
    message: string;
    schedule: string;
    isRecurring?: boolean;
    timezone?: string;
    habitId?: string;
}) {
    if (!validateCronExpression(data.schedule)) {
        throw new AppError(422, 'Invalid cron expression. Use standard 5-field cron or "one-time".');
    }

    const task = await prisma.scheduledTask.create({
        data: {
            userId,
            name: data.name,
            email: data.email,
            message: data.message,
            schedule: data.schedule,
            isRecurring: data.isRecurring ?? data.schedule !== 'one-time',
            timezone: data.timezone ?? 'UTC',
            habitId: data.habitId,
        },
    });

    const nextRunAt = await storeTaskInRedis(task);

    logger.info({ taskId: task.id, nextRunAt: new Date(nextRunAt).toISOString() }, 'Scheduled task created');
    return { ...task, nextRunAt };
}

export async function listTasks(userId: string) {
    const tasks = await prisma.scheduledTask.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    // Enrich with Redis runtime data (nextRunAt)
    const redis = getRedis();
    return Promise.all(tasks.map(async (task) => {
        const raw = await redis.hgetall(TASK_KEY(task.id));
        return { ...task, nextRunAt: raw?.nextRunAt ? Number(raw.nextRunAt) : null };
    }));
}

export async function updateTask(userId: string, taskId: string, data: {
    name?: string;
    message?: string;
    schedule?: string;
    status?: 'active' | 'paused';
    timezone?: string;
}) {
    const task = await prisma.scheduledTask.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new AppError(404, 'Task not found');

    if (data.schedule && !validateCronExpression(data.schedule)) {
        throw new AppError(422, 'Invalid cron expression');
    }

    const updated = await prisma.scheduledTask.update({
        where: { id: taskId },
        data: { ...data, updatedAt: new Date() },
    });

    // Update Redis
    const redis = getRedis();
    const nextRunAt = data.schedule ? computeNextRun(data.schedule, data.timezone ?? task.timezone) : undefined;
    const patch: Record<string, string> = {};
    if (data.name) patch.name = data.name;
    if (data.message) patch.message = data.message;
    if (data.schedule) patch.schedule = data.schedule;
    if (data.status) patch.status = data.status;
    if (data.timezone) patch.timezone = data.timezone;
    if (nextRunAt) {
        patch.nextRunAt = String(nextRunAt);
        await updateTaskDueTime(taskId, nextRunAt);
    }
    if (Object.keys(patch).length) await redis.hset(TASK_KEY(taskId), patch);

    return { ...updated, nextRunAt };
}

export async function deleteTask(userId: string, taskId: string) {
    const task = await prisma.scheduledTask.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new AppError(404, 'Task not found');

    await prisma.scheduledTask.delete({ where: { id: taskId } });
    const redis = getRedis();
    await redis.del(TASK_KEY(taskId));
    await redis.srem(USER_TASKS_KEY(userId), taskId);
    await removeTaskFromDueSet(taskId);

    logger.info({ taskId }, 'Scheduled task deleted');
}

// ─── Internal: Redis sync (called on server start) ────────────────

export async function syncTasksToRedis() {
    const tasks = await prisma.scheduledTask.findMany({ where: { status: 'active' } });
    const redis = getRedis();
    let synced = 0;
    for (const task of tasks) {
        const exists = await redis.exists(TASK_KEY(task.id));
        if (!exists) {
            const nextRunAt = computeNextRun(task.schedule, task.timezone);
            const redisData: Record<string, unknown> = {
                id: task.id,
                userId: task.userId,
                name: task.name,
                email: task.email,
                message: task.message,
                schedule: task.schedule,
                isRecurring: task.isRecurring,
                timezone: task.timezone,
                status: 'active',
                nextRunAt,
            };
            if (task.habitId) redisData.habitId = task.habitId;
            if (task.endsAt) redisData.endsAt = task.endsAt.getTime();

            await redis.hset(TASK_KEY(task.id), flattenForRedis(redisData));
            await redis.sadd(USER_TASKS_KEY(task.userId), task.id);
            await addTaskToDueSet(task.id, nextRunAt);
            synced++;
        }
    }
    if (synced > 0) logger.info({ synced }, 'Synced tasks from DB to Redis');
}
