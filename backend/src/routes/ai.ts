import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimiter.middleware';
import { validate } from '../middlewares/validate.middleware';
import { chatSchema, parseHabitSchema } from '../utils/schemas';
import * as aiService from '../services/ai.service';

const router = Router();
router.use(authenticate, aiLimiter);

router.get('/summary', async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.getPerformanceSummary(req.userId!, (req.query.range as string) || 'month');
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/insights', async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.getInsights(req.userId!, (req.query.range as string) || 'month');
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/suggestions', async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.getSuggestions(req.userId!);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/categorize', async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.getCategorization(req.userId!);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/forecast', async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.getForecast(req.userId!);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/quote', async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.getMotivationalQuote(req.userId!);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/quests/generate', async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.generateQuests(req.userId!);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/chat', validate(chatSchema), async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.chat(req.userId!, req.body.message);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/parse-habit', validate(parseHabitSchema), async (req: AuthRequest, res, next) => {
    try {
        const data = await aiService.parseNaturalLanguageHabit(req.body.text);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

export default router;
