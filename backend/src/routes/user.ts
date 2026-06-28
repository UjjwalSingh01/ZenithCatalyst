import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { registerSchema, loginSchema, refreshSchema } from '../utils/schemas';
import * as authService from '../services/auth.service';
import { env } from '../utils/env';
import logger from '../utils/logger';

const router = Router();

// ─── Google OAuth (server-side redirect flow) ───────────────────────

// 1) Kick off: redirect the browser to Google's consent screen.
router.get('/google', (_req, res) => {
    if (!authService.isGoogleConfigured()) {
        return res.redirect(`${env.FRONTEND_URL}/login?error=google_unavailable`);
    }
    // Signed, short-lived state token guards against CSRF on the callback.
    const state = jwt.sign({ n: randomBytes(8).toString('hex') }, env.JWT_SECRET, { expiresIn: '10m' });
    res.redirect(authService.getGoogleAuthUrl(state));
});

// 2) Callback: exchange code → our JWTs, then hand them to the SPA via URL hash.
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (typeof code !== 'string' || typeof state !== 'string') throw new Error('Missing code/state');
        jwt.verify(state, env.JWT_SECRET); // throws if forged or expired
        const tokens = await authService.handleGoogleCallback(code);
        res.redirect(`${env.FRONTEND_URL}/auth/google/callback#accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
    } catch (err) {
        logger.warn({ err }, 'Google OAuth callback failed');
        res.redirect(`${env.FRONTEND_URL}/login?error=google`);
    }
});

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

router.post('/logout-all', authenticate, async (req: AuthRequest, res, next) => {
    try {
        await authService.logoutAllDevices(req.userId!);
        res.json({ success: true, message: 'Logged out of all devices' });
    } catch (err) { next(err); }
});

export default router;
