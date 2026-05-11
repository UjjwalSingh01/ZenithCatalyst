import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';

export interface AuthRequest extends Request {
    userId?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Token expired or invalid' });
    }
}
