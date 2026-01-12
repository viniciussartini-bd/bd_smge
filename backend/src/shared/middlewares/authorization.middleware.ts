import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/app-errors.js';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
    const user = (req as any).user;
    
    if (!user) {
        next(new ForbiddenError('Authentication required'));
        return;
    }
    
    if (user.role !== 'ADMIN') {
        next(new ForbiddenError('This action requires administrator privileges'));
        return;
    }
    
    next();
}