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
