import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.config.js';
import { UnauthorizedError } from '../errors/app-errors.js';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.utils.js';

export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            throw new UnauthorizedError('Authentication token is required');
        }

        const payload = verifyToken(token);

        const revokedToken = await prisma.revokedToken.findUnique({
            where: { token },
        });

        if (revokedToken) {
            throw new UnauthorizedError('Token has been revoked. Please login again.');
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        if (!user) {
            throw new UnauthorizedError('User not found. Please login again.');
        }

        (req as any).user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            next(error);
            return;
        }
        next(new UnauthorizedError('Authentication failed'));
    }
}