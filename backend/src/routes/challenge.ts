import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { saveQuestsSchema, updateProfileSchema, changePasswordSchema } from '../utils/schemas';
import * as profileService from '../services/profile.service';
import { AppError } from '../middlewares/error.middleware';
import { prisma } from '../utils/prisma';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
        if (['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) cb(null, true);
        else cb(new AppError(400, 'Only PNG, JPEG, or WebP images are allowed'));
    },
});

// ─── Public avatar (no auth, so it works in an <img src>) ──────────
router.get('/avatar/:userId', async (req, res, next) => {
    try {
        const avatar = await profileService.getAvatar(req.params.userId);
        if (!avatar) {
            res.status(404).json({ success: false, message: 'No avatar set' });
            return;
        }
        res.setHeader('Content-Type', avatar.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(avatar.data));
    } catch (err) { next(err); }
});

// Everything below requires authentication
router.use(authenticate);

// Get user profile with gamification stats
router.get('/me', async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId! },
            select: {
                id: true, firstName: true, lastName: true, email: true,
                experiencePoints: true, level: true, currentStreak: true, longestStreak: true,
                createdAt: true, avatarUpdatedAt: true,
                badges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
                quests: { where: { isCompleted: false }, orderBy: { createdAt: 'desc' } },
            },
        });
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
});

// Get chat history
router.get('/chat-history', async (req: AuthRequest, res, next) => {
    try {
        const messages = await prisma.chatMessage.findMany({
            where: { userId: req.userId! },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });
        res.json({ success: true, data: messages });
    } catch (err) { next(err); }
});

// Delete chat history
router.delete('/chat-history', async (req: AuthRequest, res, next) => {
    try {
        await prisma.chatMessage.deleteMany({ where: { userId: req.userId! } });
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (err) { next(err); }
});

// Get quests
router.get('/quests', async (req: AuthRequest, res, next) => {
    try {
        const quests = await prisma.quest.findMany({
            where: { userId: req.userId! },
            orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
        });
        res.json({ success: true, data: quests });
    } catch (err) { next(err); }
});

// Save AI-generated quests (validated)
router.post('/quests', validate(saveQuestsSchema), async (req: AuthRequest, res, next) => {
    try {
        const { quests } = req.body;
        const created = await Promise.all(
            quests.map((q: { title: string; description: string; xpReward?: number; condition?: Record<string, unknown>; durationDays?: number }) => {
                const expiresAt = q.durationDays
                    ? new Date(Date.now() + q.durationDays * 86400000)
                    : undefined;
                return prisma.quest.create({
                    data: {
                        userId: req.userId!,
                        title: q.title,
                        description: q.description,
                        xpReward: q.xpReward ?? 50,
                        condition: (q.condition ?? {}) as any,
                        expiresAt,
                    },
                });
            })
        );
        res.status(201).json({ success: true, data: created });
    } catch (err) { next(err); }
});

// ─── Account management ────────────────────────────────────────────

// Update profile (name / email)
router.patch('/', validate(updateProfileSchema), async (req: AuthRequest, res, next) => {
    try {
        const user = await profileService.updateProfile(req.userId!, req.body);
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
});

// Change password (rate-limited; invalidates other sessions)
router.patch('/password', authLimiter, validate(changePasswordSchema), async (req: AuthRequest, res, next) => {
    try {
        await profileService.changePassword(req.userId!, req.body.currentPassword, req.body.newPassword);
        res.json({ success: true, message: 'Password changed. Other sessions have been logged out.' });
    } catch (err) { next(err); }
});

// Delete account
router.delete('/', async (req: AuthRequest, res, next) => {
    try {
        await profileService.deleteAccount(req.userId!);
        res.json({ success: true, message: 'Account deleted' });
    } catch (err) { next(err); }
});

// Upload / replace avatar
router.post('/avatar', upload.single('avatar'), async (req: AuthRequest, res, next) => {
    try {
        if (!req.file) throw new AppError(400, 'No image file provided');
        const result = await profileService.setAvatar(req.userId!, req.file.buffer);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

export default router;
