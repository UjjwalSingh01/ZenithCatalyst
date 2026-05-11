import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createHabitSchema, updateHabitSchema, toggleHabitDateSchema, toggleSubHabitDateSchema } from '../utils/schemas';
import * as habitService from '../services/habit.service';

const router = Router();
router.use(authenticate);

// Habits CRUD
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const includeArchived = req.query.includeArchived === 'true';
        const habits = await habitService.getHabits(req.userId!, includeArchived);
        res.json({ success: true, data: habits });
    } catch (err) { next(err); }
});

router.post('/', validate(createHabitSchema), async (req: AuthRequest, res, next) => {
    try {
        const habit = await habitService.createHabit(req.userId!, req.body);
        res.status(201).json({ success: true, data: habit });
    } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const habit = await habitService.getHabitById(req.userId!, req.params.id);
        res.json({ success: true, data: habit });
    } catch (err) { next(err); }
});

router.put('/:id', validate(updateHabitSchema), async (req: AuthRequest, res, next) => {
    try {
        const habit = await habitService.updateHabit(req.userId!, req.params.id, req.body);
        res.json({ success: true, data: habit });
    } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        await habitService.deleteHabit(req.userId!, req.params.id);
        res.json({ success: true, message: 'Habit deleted' });
    } catch (err) { next(err); }
});

// Day view
router.get('/day/:date', async (req: AuthRequest, res, next) => {
    try {
        const habits = await habitService.getHabitsForDate(req.userId!, req.params.date);
        res.json({ success: true, data: habits });
    } catch (err) { next(err); }
});

// Toggle completion
router.post('/:id/toggle', validate(toggleHabitDateSchema), async (req: AuthRequest, res, next) => {
    try {
        const result = await habitService.toggleHabitDate(req.userId!, req.params.id, req.body.date, req.body.completed);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

// Toggle sub-habit
router.post('/sub/:subId/toggle', validate(toggleSubHabitDateSchema), async (req: AuthRequest, res, next) => {
    try {
        const result = await habitService.toggleSubHabitDate(req.userId!, req.params.subId, req.body.date, req.body.completed);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

export default router;
