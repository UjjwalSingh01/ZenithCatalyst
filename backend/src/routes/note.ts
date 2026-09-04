import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { moodLogSchema } from '../utils/schemas';
import * as analyticsService from '../services/analytics.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const range = (req.query.range as string) || 'month';
        const data = await analyticsService.getAnalytics(req.userId!, range);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/grid', async (req: AuthRequest, res, next) => {
    try {
        const today = new Date();
        const fallbackFrom = new Date(today);
        fallbackFrom.setDate(fallbackFrom.getDate() - 13);

        const from = DATE_RE.test(String(req.query.from)) ? String(req.query.from) : fallbackFrom.toISOString().split('T')[0];
        const rawTo = DATE_RE.test(String(req.query.to)) ? String(req.query.to) : today.toISOString().split('T')[0];
        // A reversed window would otherwise come back as an empty grid with no
        // hint as to why; swallow it by clamping instead.
        const to = rawTo >= from ? rawTo : from;

        const data = await analyticsService.getHabitGrid(req.userId!, from, to);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/mood-correlation', async (req: AuthRequest, res, next) => {
    try {
        const data = await analyticsService.getMoodCorrelation(req.userId!);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/mood', validate(moodLogSchema), async (req: AuthRequest, res, next) => {
    try {
        const { date, mood, energy, note } = req.body;
        const data = await analyticsService.upsertMoodLog(req.userId!, date, mood, energy, note);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

export default router;
