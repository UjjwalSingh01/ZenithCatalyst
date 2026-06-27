import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';
import { getTokenVersion } from '../services/token.service';

export interface AuthRequest extends Request {
    userId?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.split(' ')[1];
    let decoded: { userId: string; tv?: number };
    try {
        decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; tv?: number };
    } catch {
        res.status(401).json({ success: false, message: 'Token expired or invalid' });
        return;
    }

    try {
        // Tokens issued before token versioning have no `tv` → treat as version 0.
        const currentVersion = await getTokenVersion(decoded.userId);
        if ((decoded.tv ?? 0) !== currentVersion) {
            res.status(401).json({ success: false, message: 'Session expired, please log in again' });
            return;
        }
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Token expired or invalid' });
    }
}
