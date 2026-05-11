import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        logger.warn({ err, path: req.path, method: req.method }, err.message);
        res.status(err.statusCode).json({ success: false, message: err.message });
        return;
    }

    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
    res.status(500).json({ success: false, message: 'An internal server error occurred' });
}

export function notFound(req: Request, res: Response): void {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}
