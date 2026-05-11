import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            res.status(422).json({ success: false, message: 'Validation failed', errors });
            return;
        }
        req.body = result.data;
        next();
    };
}

export function validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            res.status(422).json({ success: false, message: 'Invalid query parameters', errors });
            return;
        }
        req.query = result.data as any;
        next();
    };
}
