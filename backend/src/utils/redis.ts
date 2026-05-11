import Redis from 'ioredis';
import logger from './logger';

let client: Redis | null = null;

export function getRedis(): Redis {
    if (client) return client;

    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        connectTimeout: 5000,
        retryStrategy: (times) => {
            if (times > 5) {
                logger.error('Redis: max retries reached. Giving up.');
                return null;
            }
            return Math.min(times * 200, 2000);
        },
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('ready', () => logger.info('Redis ready'));
    client.on('error', (err) => logger.error({ err }, 'Redis error'));
    client.on('close', () => logger.warn('Redis connection closed'));

    return client;
}

export async function disconnectRedis(): Promise<void> {
    if (client) {
        await client.quit();
        client = null;
    }
}

// ─── Key helpers ─────────────────────────────────────────────────
export const TASK_KEY = (taskId: string) => `scheduler:task:${taskId}`;
export const USER_TASKS_KEY = (userId: string) => `scheduler:user:${userId}`;
export const LOCK_KEY = (taskId: string) => `scheduler:lock:${taskId}`;
export const METRICS_KEY = 'scheduler:metrics';

// ─── Sorted Set for efficient due-task lookup ────────────────────
export const DUE_TASKS_ZSET = 'scheduler:due_tasks';

/**
 * Add a task to the sorted set with its nextRunAt as the score.
 * This enables O(log N) lookup of due tasks via ZRANGEBYSCORE.
 */
export async function addTaskToDueSet(taskId: string, nextRunAt: number): Promise<void> {
    const redis = getRedis();
    await redis.zadd(DUE_TASKS_ZSET, nextRunAt, taskId);
}

/**
 * Remove a task from the due set (on delete or completion).
 */
export async function removeTaskFromDueSet(taskId: string): Promise<void> {
    const redis = getRedis();
    await redis.zrem(DUE_TASKS_ZSET, taskId);
}

/**
 * Get all task IDs that are due (nextRunAt <= now).
 * Returns task IDs sorted by their due time.
 */
export async function getDueTaskIds(now?: number): Promise<string[]> {
    const redis = getRedis();
    const timestamp = now ?? Date.now();
    return redis.zrangebyscore(DUE_TASKS_ZSET, 0, timestamp);
}

/**
 * Update a task's score (nextRunAt) in the sorted set.
 */
export async function updateTaskDueTime(taskId: string, nextRunAt: number): Promise<void> {
    const redis = getRedis();
    await redis.zadd(DUE_TASKS_ZSET, nextRunAt, taskId);
}
