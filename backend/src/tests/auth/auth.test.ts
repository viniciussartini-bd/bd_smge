import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/auth/register', () => {
    it('should register successfully', async () => {
        const response = await request(app).post('/api/auth/register').send({
            email: 'test@example.com',
            password: 'Test@123456',
            name: 'Test User',
        }).expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
    });

    it('should return 409 if email exists', async () => {
        await createTestUser({
            email: 'duplicate@example.com',
            password: 'Test@123456',
        });

        await request(app).post('/api/auth/register').send({
            email: 'duplicate@example.com',
            password: 'Test@123456',
            name: 'Test',
        }).expect(409);
    });

    it('should return 400 with weak password', async () => {
        await request(app).post('/api/auth/register').send({
            email: 'weak@example.com',
            password: 'weak',
            name: 'Test User',
        }).expect(400);
    });
});

describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
        const user = await createTestUser({
            email: 'login@example.com',
            password: 'Test@123456',
        });

        const response = await request(app).post('/api/auth/login').send({
            email: user.email,
            password: 'Test@123456',
        }).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
        const user = await createTestUser({
            email: 'wrong@example.com',
            password: 'Test@123456',
        });

        await request(app).post('/api/auth/login').send({
            email: user.email,
            password: 'Wrong@123456',
        }).expect(401);
    });

    it('should return 401 with non-existent email', async () => {
        await request(app).post('/api/auth/login').send({
            email: 'nonexistent@example.com',
            password: 'Test@123456',
        }).expect(401);
    });
});

describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .post('/api/auth/logout')
            .set('Authorization', createAuthHeader(token))
            .expect(200);
    });

    it('should return 401 without token', async () => {
        await request(app).post('/api/auth/logout').expect(401);
    });

    it('should return 401 with revoked token', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .post('/api/auth/logout')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        await request(app)
            .post('/api/auth/logout')
            .set('Authorization', createAuthHeader(token))
            .expect(401);
    });
});

describe('POST /api/auth/forgot-password', () => {
    it('should return success for valid email', async () => {
        await createTestUser({ email: 'forgot@example.com' });

        await request(app).post('/api/auth/forgot-password').send({
            email: 'forgot@example.com',
        }).expect(200);
    });

    it('should return success for non-existent email', async () => {
        await request(app).post('/api/auth/forgot-password').send({
            email: 'nonexistent@example.com',
        }).expect(200);
    });
});

describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully', async () => {
        const user = await createTestUser({
            email: 'reset@example.com',
            password: 'Old@123456',
        });

        const resetToken = await prisma.passwordReset.create({
            data: {
                userId: user.id,
                token: 'valid-reset-token',
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