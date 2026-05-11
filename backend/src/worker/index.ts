/**
 * Cron Worker — runs as a separate container/process.
 * 
 * Every minute:
 *  1. Queries the Redis sorted set for tasks where nextRunAt ≤ now (O(log N))
 *  2. Acquires a distributed Redis lock (SETNX) to prevent duplicate execution
 *  3. Checks if the task has expired (endsAt)
 *  4. Sends the email reminder (with retry logic)
 *  5. Updates nextRunAt or marks task completed
 *  6. Releases the lock
 */

import 'dotenv/config';
import { CronJob } from 'cron';
import {
    getRedis, disconnectRedis, TASK_KEY, LOCK_KEY, METRICS_KEY,
    getDueTaskIds, updateTaskDueTime, removeTaskFromDueSet,
} from '../utils/redis';
import { prisma } from '../utils/prisma';
import { sendHabitReminder } from '../services/email.service';
import { computeNextRun } from '../services/scheduler.service';
import { generateReminderMessage } from '../services/ai.service';
import logger from '../utils/logger';

const LOCK_TTL = 55; // seconds — slightly less than tick interval to prevent overlap
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 15000]; // ms — exponential backoff

interface TaskData {
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

/**
 * Send email with retry logic (max 3 attempts with exponential backoff).
 */
async function sendWithRetry(opts: {
    to: string;
    userName: string;
    habitName: string;
    message: string;
}): Promise<boolean> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const sent = await sendHabitReminder(opts);
        if (sent) return true;

        if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || 5000;
            logger.warn({ attempt: attempt + 1, maxRetries: MAX_RETRIES, to: opts.to }, `Email send failed, retrying in ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    return false;
}

async function processTask(redis: ReturnType<typeof getRedis>, taskId: string): Promise<void> {
    const raw = await redis.hgetall(TASK_KEY(taskId));
    if (!raw || !raw.id) {
        // Task data missing from Redis — clean up sorted set
        await removeTaskFromDueSet(taskId);
        return;
    }

    const task = raw as unknown as TaskData;
    if (task.status !== 'active') {
        await removeTaskFromDueSet(taskId);
        return;
    }

    // ─── Check expiration ─────────────────────────────────────────
    if (task.endsAt) {
        const endsAt = Number(task.endsAt);
        if (Date.now() > endsAt) {
            // Expired — mark completed
            await redis.hset(TASK_KEY(taskId), 'status', 'completed');
            await removeTaskFromDueSet(taskId);
            await prisma.scheduledTask.update({
                where: { id: taskId },
                data: { status: 'completed' },
            }).catch(() => { /* task may not exist in DB */ });
            logger.info({ taskId }, 'Reminder expired — marked completed');
            return;
        }
    }

    // ─── Distributed lock ──────────────────────────────────────────
    const lockKey = LOCK_KEY(taskId);
    const lock = await redis.set(lockKey, '1', 'EX', LOCK_TTL, 'NX');
    if (!lock) {
        logger.debug({ taskId }, 'Task already being processed by another worker — skipping');
        return;
    }

    const start = Date.now();
    try {
        // Get user name for personalised email
        const user = await prisma.user.findUnique({
            where: { id: task.userId },
            select: { firstName: true, lastName: true },
        });
        const userName = user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'there';

        // Try to generate an AI motivational message (with fallback to stored message)
        let message = task.message;
        try {
            const aiMessage = await generateReminderMessage(task.name);
            if (aiMessage) message = aiMessage;
        } catch {
            // Use the stored message as fallback
        }

        // Send the email with retry logic
        const sent = await sendWithRetry({
            to: task.email,
            userName,
            habitName: task.name,
            message,
        });

        const latency = Date.now() - start;
        logger.info({ taskId, sent, latencyMs: latency }, 'Task executed');

        // Update metrics in Redis
        await redis.hincrby(METRICS_KEY, 'totalExecuted', 1);
        if (!sent) await redis.hincrby(METRICS_KEY, 'totalFailed', 1);

        // ─── Schedule next run or complete ────────────────────────────
        if (task.isRecurring === 'true') {
            const nextRun = computeNextRun(task.schedule, task.timezone || 'UTC');
            await redis.hset(TASK_KEY(taskId), 'nextRunAt', String(nextRun));
            await updateTaskDueTime(taskId, nextRun);
            logger.info({ taskId, nextRun: new Date(nextRun).toISOString() }, 'Task rescheduled');
        } else {
            // One-time task: mark completed
            await redis.hset(TASK_KEY(taskId), 'status', 'completed');
            await removeTaskFromDueSet(taskId);
            await prisma.scheduledTask.update({
                where: { id: taskId },
                data: { status: 'completed' },
            });
            logger.info({ taskId }, 'One-time task completed');
        }

    } catch (err) {
        logger.error({ err, taskId }, 'Task execution failed');
        await redis.hincrby(METRICS_KEY, 'totalFailed', 1);
    } finally {
        // Always release the lock
        await redis.del(lockKey);
    }
}

async function tick(): Promise<void> {
    const redis = getRedis();

    try {
        // Use sorted set for efficient due-task lookup (O(log N) instead of O(N) SCAN)
        const taskIds = await getDueTaskIds();

        if (taskIds.length === 0) return;

        logger.debug({ taskCount: taskIds.length }, 'Worker tick: processing due tasks');

        // Process tasks sequentially to avoid overwhelming SMTP
        for (const id of taskIds) {
            await processTask(redis, id);
        }
    } catch (err) {
        logger.error({ err }, 'Worker tick failed');
    }
}

// ─── Start the cron job ──────────────────────────────────────────

logger.info('⚙️  Cron worker starting...');

// Initialize Redis connection
getRedis();

// Run every minute
const job = new CronJob('* * * * *', tick, null, true, 'UTC');
job.start();

logger.info('✅ Cron worker running — checking tasks every minute');

// ─── Graceful shutdown ───────────────────────────────────────────

const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down worker`);
    job.stop();
    await prisma.$disconnect();
    await disconnectRedis();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection in worker');
});
