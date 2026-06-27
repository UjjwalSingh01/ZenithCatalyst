import { prisma } from '../utils/prisma';
import { getRedis, TOKEN_VERSION_KEY } from '../utils/redis';
import logger from '../utils/logger';

const CACHE_TTL_SECONDS = 86400; // 24h

/**
 * Best-effort cache write. Never throws — Redis being unavailable must not
 * break auth, since the DB remains the source of truth.
 */
async function cacheVersion(userId: string, version: number): Promise<void> {
    try {
        await getRedis().set(TOKEN_VERSION_KEY(userId), version, 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
        logger.warn({ err, userId }, 'Failed to cache token version');
    }
}

/**
 * Returns the user's current token version. Reads from Redis when possible,
 * falling back to the database on a cache miss or any Redis error.
 */
export async function getTokenVersion(userId: string): Promise<number> {
    try {
        const cached = await getRedis().get(TOKEN_VERSION_KEY(userId));
        if (cached !== null) return Number(cached);
    } catch (err) {
        logger.warn({ err, userId }, 'Redis read failed; falling back to DB for token version');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tokenVersion: true },
    });
    const version = user?.tokenVersion ?? 0;
    await cacheVersion(userId, version);
    return version;
}

/**
 * Increments the user's token version, instantly invalidating every
 * outstanding access token. Returns the new version.
 */
export async function bumpTokenVersion(userId: string): Promise<number> {
    const { tokenVersion } = await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
        select: { tokenVersion: true },
    });
    await cacheVersion(userId, tokenVersion);
    return tokenVersion;
}
