import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/error.middleware';
import { bumpTokenVersion } from './token.service';

const SALT_ROUNDS = 12;

// Safe user fields returned to the client (mirrors GET /profile/me, minus relations).
const profileSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    experiencePoints: true,
    level: true,
    currentStreak: true,
    longestStreak: true,
    createdAt: true,
    avatarUpdatedAt: true,
} as const;

export async function updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string | null; email?: string }
) {
    if (data.email) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== userId) {
            throw new AppError(409, 'An account with this email already exists');
        }
    }

    return prisma.user.update({
        where: { id: userId },
        data,
        select: profileSelect,
    });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new AppError(401, 'Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    // Invalidate all refresh tokens AND outstanding access tokens so other
    // sessions are logged out immediately.
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await bumpTokenVersion(userId);
}

export async function deleteAccount(userId: string) {
    // All User relations cascade on delete (see schema.prisma).
    await prisma.user.delete({ where: { id: userId } });
}

export async function setAvatar(userId: string, buffer: Buffer) {
    const processed = await sharp(buffer)
        .resize(256, 256, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
    // Prisma's Bytes field expects a Uint8Array backed by a plain ArrayBuffer.
    const data = new Uint8Array(processed);

    const now = new Date();
    await prisma.$transaction([
        prisma.avatar.upsert({
            where: { userId },
            create: { userId, data, mimeType: 'image/webp' },
            update: { data, mimeType: 'image/webp' },
        }),
        prisma.user.update({ where: { id: userId }, data: { avatarUpdatedAt: now } }),
    ]);

    return { avatarUpdatedAt: now };
}

export async function getAvatar(userId: string) {
    return prisma.avatar.findUnique({ where: { userId }, select: { data: true, mimeType: true } });
}
