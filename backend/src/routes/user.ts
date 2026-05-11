import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { registerSchema, loginSchema, refreshSchema } from '../utils/schemas';
import * as authService from '../services/auth.service';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
    try {
        const result = await authService.registerUser(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
    try {
        const result = await authService.loginUser(req.body.email, req.body.password);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
});

router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
    try {
        const tokens = await authService.refreshAccessToken(req.body.refreshToken);
        res.json({ success: true, data: tokens });
    } catch (err) { next(err); }
});

router.post('/logout', validate(refreshSchema), async (req, res, next) => {
    try {
        await authService.logoutUser(req.body.refreshToken);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) { next(err); }
});

export default router;
