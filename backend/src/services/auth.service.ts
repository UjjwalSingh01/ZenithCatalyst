import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/error.middleware';
import { env } from '../utils/env';

const SALT_ROUNDS = 12;

export async function registerUser(data: {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
}) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'An account with this email already exists');

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await prisma.user.create({
        data: { ...data, password: hashedPassword },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, level: true, experiencePoints: true },
    });

    // Award "First Steps" badge on registration
    await seedDefaultBadgesIfNeeded();
    await tryAwardBadge(user.id, 'First Steps');

    const tokens = generateTokens(user.id);
    await storeRefreshToken(user.id, tokens.refreshToken);
    return { user, ...tokens };
}

export async function loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const tokens = generateTokens(user.id);
    await storeRefreshToken(user.id, tokens.refreshToken);

    const { password: _, ...safeUser } = user;
    return { user: safeUser, ...tokens };
}

export async function refreshAccessToken(refreshToken: string) {
    let decoded: { userId: string };
    try {
        decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
        throw new AppError(401, 'Invalid or expired refresh token');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
        throw new AppError(401, 'Refresh token revoked or expired');
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = generateTokens(decoded.userId);
    await storeRefreshToken(decoded.userId, tokens.refreshToken);
    return tokens;
}

export async function logoutUser(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

// ─── Helpers ────────────────────────────────────────────────────────

function generateTokens(userId: string) {
    const accessToken = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
    return { accessToken, refreshToken };
}

async function storeRefreshToken(userId: string, token: string) {
    const decoded = jwt.decode(token) as { exp: number };
    await prisma.refreshToken.create({
        data: { token, userId, expiresAt: new Date(decoded.exp * 1000) },
    });
}

// ─── Badge helpers (reused by gamification service too) ─────────────

export async function tryAwardBadge(userId: string, badgeName: string) {
    const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
    if (!badge) return;
    await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        create: { userId, badgeId: badge.id },
        update: {},
    });
}

async function seedDefaultBadgesIfNeeded() {
    const count = await prisma.badge.count();
    if (count > 0) return;

    const badges = [
        { name: 'First Steps', description: 'Created your account', icon: '🌱', xpRequired: 0 },
        { name: 'Habit Starter', description: 'Created your first habit', icon: '📌', xpRequired: 0 },
        { name: 'On a Roll', description: 'Completed habits 3 days in a row', icon: '🔥', xpRequired: 0 },
        { name: 'Week Warrior', description: '7-day streak achieved', icon: '⚔️', xpRequired: 0 },
        { name: 'Month Master', description: '30-day streak achieved', icon: '🏆', xpRequired: 0 },
        { name: 'Centurion', description: 'Earned 100 XP', icon: '💯', xpRequired: 100 },
        { name: 'Legend', description: 'Earned 1000 XP', icon: '🌟', xpRequired: 1000 },
        { name: 'Habit Hoarder', description: 'Tracking 5+ habits at once', icon: '📚', xpRequired: 0 },
        { name: 'Perfect Day', description: 'Completed all habits in a single day', icon: '✨', xpRequired: 0 },
        { name: 'Comeback Kid', description: 'Resumed a habit after a 5-day gap', icon: '💪', xpRequired: 0 },
    ];

    await prisma.badge.createMany({ data: badges, skipDuplicates: true });
}
