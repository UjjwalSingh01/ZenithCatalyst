import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';
import * as schedulerService from '../services/scheduler.service';

const router = Router();
router.use(authenticate);

// ─── Validation Schemas ──────────────────────────────────────────

const createSchema = z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    message: z.string().min(1).max(2000),
    schedule: z.string().min(1),
    isRecurring: z.boolean().optional(),
    timezone: z.string().optional(),
    habitId: z.string().uuid().optional(),
});

const updateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    message: z.string().min(1).max(2000).optional(),
    schedule: z.string().min(1).optional(),
    status: z.enum(['active', 'paused']).optional(),
    timezone: z.string().optional(),
});

// ─── Routes ──────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const tasks = await schedulerService.listTasks(req.userId!);
        res.json({ success: true, data: tasks });
    } catch (err) { next(err); }
});

router.post('/', validate(createSchema), async (req: AuthRequest, res, next) => {
    try {
        const task = await schedulerService.createTask(req.userId!, req.body);
        res.status(201).json({ success: true, data: task });
    } catch (err) { next(err); }
});

router.put('/:id', validate(updateSchema), async (req: AuthRequest, res, next) => {
    try {
        const task = await schedulerService.updateTask(req.userId!, req.params.id, req.body);
        res.json({ success: true, data: task });
    } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        await schedulerService.deleteTask(req.userId!, req.params.id);
        res.json({ success: true, message: 'Reminder deleted' });
    } catch (err) { next(err); }
});

// ─── Validate schedule expression ────────────────────────────────

router.post('/validate', authenticate, async (req: AuthRequest, res) => {
    const { schedule } = req.body;
    const valid = schedulerService.validateCronExpression(schedule);
    const nextRun = valid ? new Date(schedulerService.computeNextRun(schedule)).toISOString() : null;
    res.json({ success: true, data: { valid, nextRun } });
});

export default router;
