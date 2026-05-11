import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './utils/env';
import logger from './utils/logger';
import { prisma } from './utils/prisma';
import { errorHandler, notFound } from './middlewares/error.middleware';
import { generalLimiter } from './middlewares/rateLimiter.middleware';

// ─── Routes ───────────────────────────────────────────────────────
import authRoutes from './routes/user';
import habitRoutes from './routes/todo';
import aiRoutes from './routes/ai';
import analyticsRoutes from './routes/note';
import profileRoutes from './routes/challenge';
import schedulerRoutes from './routes/scheduler';
import { getRedis, disconnectRedis } from './utils/redis';
import { syncTasksToRedis } from './services/scheduler.service';

// ─── App Setup ────────────────────────────────────────────────────
const app = express();

// Trust the Nginx reverse proxy
app.set('trust proxy', 1);

// Security & Performance
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(compression() as any);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Request Logging (dev only)
if (env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            logger.info({ method: req.method, url: req.url, status: res.statusCode, ms: Date.now() - start }, 'Request');
        });
        next();
    });
}

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        const redis = getRedis();
        const redisPing = await redis.ping().catch(() => 'error');
        res.json({
            status: 'ok',
            database: 'connected',
            redis: redisPing === 'PONG' ? 'connected' : 'error',
            timestamp: new Date().toISOString(),
        });
    } catch {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/scheduler', schedulerRoutes);

// ─── Error Handling ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────
const server = app.listen(env.PORT, async () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    // Sync active tasks from DB into Redis on startup
    try { await syncTasksToRedis(); } catch (err) { logger.warn({ err }, 'Redis sync skipped (Redis may not be available)'); }
});

// ─── Graceful Shutdown ────────────────────────────────────────────
const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        await disconnectRedis();
        logger.info('Server closed. Database and Redis disconnected.');
        process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
});

export default app;
