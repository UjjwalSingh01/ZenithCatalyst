import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { saveQuestsSchema } from '../utils/schemas';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(authenticate);

// Get user profile with gamification stats
router.get('/me', async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId! },
            select: {
                id: true, firstName: true, lastName: true, email: true,
                experiencePoints: true, level: true, currentStreak: true, longestStreak: true,
                createdAt: true,
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

export default router;
