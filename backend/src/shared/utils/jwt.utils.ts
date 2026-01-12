import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.config.js';
import { UnauthorizedError } from '../errors/app-errors.js';

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    name: string;
    isMobile: boolean;
}

export function generateToken(payload: JwtPayload): string {
    const expiresIn: SignOptions["expiresIn"] = payload.isMobile
        ? env.JWT_EXPIRES_IN_MOBILE
        : env.JWT_EXPIRES_IN;

    const options: SignOptions = {
        expiresIn,
        issuer: 'energy-management-system',
        audience: 'energy-management-users',
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            issuer: 'energy-management-system',
            audience: 'energy-management-users',
        }) as JwtPayload;

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token has expired. Please login again.');
        }

        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid token. Please login again.');
        }

        throw new UnauthorizedError('Token verification failed.');
    }
}

export function extractTokenFromHeader(authorizationHeader?: string): string | null {
    if (!authorizationHeader) {
        return null;
    }

    const parts = authorizationHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}