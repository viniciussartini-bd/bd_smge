import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authRepository } from './auth.repository.js';
import { generateToken, verifyToken } from '../../shared/utils/jwt.utils.js';
import { UnauthorizedError, ConflictError } from '../../shared/errors/app-errors.js';
import type { AuthResponse } from './auth.types.js';
import type { RegisterInput, LoginInput } from './auth.validators.js';

export class AuthService {
    async register(data: RegisterInput): Promise<AuthResponse> {
        const existingUser = await authRepository.findByEmail(data.email);
        if (existingUser) {
            throw new ConflictError('A user with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await authRepository.create(data.email, hashedPassword, data.name);

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            isMobile: false,
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token,
            expiresAt
        };
    }

    async login(data: LoginInput): Promise<AuthResponse> {
        const user = await authRepository.findByEmail(data.email);

        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            isMobile: data.isMobile || false,
        });

        const expiresAt = new Date();

        if (data.isMobile) {
            expiresAt.setDate(expiresAt.getDate() + 365);
        } else {
            expiresAt.setDate(expiresAt.getDate() + 7);
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token,
            expiresAt
        };
    }

    async logout(token: string): Promise<void> {
        const payload = verifyToken(token);
        const expiresAt = new Date();

        if (payload.isMobile) {
            expiresAt.setDate(expiresAt.getDate() + 365);
        } else {
            expiresAt.setDate(expiresAt.getDate() + 7);
        }
        await authRepository.revokeToken(payload.userId, token, expiresAt);
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await authRepository.findByEmail(email);

        if (!user) {
            return;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000);
        await authRepository.createPasswordReset(user.id, resetToken, expiresAt);
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const resetToken = await authRepository.findPasswordResetToken(token);
        
        if (!resetToken) {
            throw new UnauthorizedError('Invalid or expired reset token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await authRepository.updatePassword(resetToken.userId, hashedPassword);
        await authRepository.markPasswordResetAsUsed(resetToken.id);
    }
}

export const authService = new AuthService();