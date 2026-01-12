import { prisma } from '../../config/database.config.js';
import { User, PasswordReset, RevokedToken } from '@prisma/client';

export class AuthRepository {
    async findByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
    }

    async findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } });
    }

    async create(email: string, password: string, name: string): Promise<Omit<User, 'password'>> {
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password,
                name,
                role: 'USER' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true },
        });
        return user;
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<User> {
        return prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    }

    async createPasswordReset(userId: string, token: string, expiresAt: Date): Promise<PasswordReset> {
        return prisma.passwordReset.create({
            data: {
                userId,
                token,
                expiresAt,
                used: false
            },
        });
    }

    async findPasswordResetToken(token: string): Promise<PasswordReset | null> {
        return prisma.passwordReset.findFirst({
            where: {
                token,
                used: false,
                expiresAt: { gt: new Date() } },
        });
    }

    async markPasswordResetAsUsed(tokenId: string): Promise<PasswordReset> {
        return prisma.passwordReset.update({
            where: { id: tokenId },
            data: { used: true },
        });
    }

    async revokeToken(userId: string, token: string, expiresAt: Date): Promise<RevokedToken> {
        return prisma.revokedToken.create({
            data: { userId, token, expiresAt },
        });
    }

    async isTokenRevoked(token: string): Promise<RevokedToken | null> {
        return prisma.revokedToken.findUnique({ where: { token } });
    }
}

export const authRepository = new AuthRepository();