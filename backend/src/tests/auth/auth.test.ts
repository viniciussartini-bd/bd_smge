import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/auth/register', () => {
    it('should register successfully', async () => {
        const response = await request(app).post('/api/auth/register').send({
            email: 'new@test.com',
            password: 'Test@123456',
            name: 'New User',
        }).expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe('new@test.com');
        expect(response.body.data.token).toBeDefined();
    });

    it('should return 409 if email exists', async () => {
        const user = await createTestUser({ email: 'existing@test.com' });
        await request(app).post('/api/auth/register').send({
            email: user.email,
            password: 'Test@123456',
            name: 'Test',
        }).expect(409);
    });

    it('should return 400 with weak password', async () => {
        await request(app).post('/api/auth/register').send({
            email: 'test@test.com',
            password: 'weak',
            name: 'Test',
        }).expect(400);
    });
});

describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
        const user = await createTestUser({ email: 'login@test.com', password: 'Test@123456' });
        const response = await request(app).post('/api/auth/login').send({
            email: user.email,
            password: user.password,
        }).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
        const user = await createTestUser({ email: 'wrong@test.com' });
        await request(app).post('/api/auth/login').send({
            email: user.email,
            password: 'WrongPass@123',
        }).expect(401);
    });

    it('should return 401 with non-existent email', async () => {
        await request(app).post('/api/auth/login').send({
            email: 'nonexistent@test.com',
            password: 'Test@123456',
        }).expect(401);
    });
});

describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app).post('/api/auth/logout')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const revoked = await prisma.revokedToken.findUnique({ where: { token } });
        expect(revoked).toBeDefined();
    });

    it('should return 401 without token', async () => {
        await request(app).post('/api/auth/logout').expect(401);
    });

    it('should return 401 with revoked token', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app).post('/api/auth/logout')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        await request(app).post('/api/auth/logout')
            .set('Authorization', createAuthHeader(token))
            .expect(401);
    });
});

describe('POST /api/auth/forgot-password', () => {
    it('should return success for valid email', async () => {
        const user = await createTestUser({ email: 'forgot@test.com' });
        const response = await request(app).post('/api/auth/forgot-password')
            .send({ email: user.email })
            .expect(200);

        expect(response.body.success).toBe(true);

        const resetToken = await prisma.passwordReset.findFirst({
            where: { userId: user.id },
        });
        expect(resetToken).toBeDefined();
    });

    it('should return success for non-existent email', async () => {
        await request(app).post('/api/auth/forgot-password')
            .send({ email: 'nonexistent@test.com' })
            .expect(200);
    });
});

describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully', async () => {
        const user = await createTestUser({ email: 'reset@test.com', password: 'Old@123456' });
        const resetToken = await prisma.passwordReset.create({
            data: {
                userId: user.id,
                token: 'valid-token-123',
                expiresAt: new Date(Date.now() + 3600000),
            },
        });

        await request(app).post('/api/auth/reset-password').send({
            token: resetToken.token,
            newPassword: 'New@123456',
        }).expect(200);

        const response = await request(app).post('/api/auth/login').send({
            email: user.email,
            password: 'New@123456',
        }).expect(200);

        expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 with invalid token', async () => {
        await request(app).post('/api/auth/reset-password').send({
            token: 'invalid-token',
            newPassword: 'New@123456',
        }).expect(401);
    });
});