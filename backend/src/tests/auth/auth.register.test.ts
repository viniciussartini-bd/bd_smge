import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser } from '../helpers.js';

/**
 * Suite de testes para a funcionalidade de registro de usuários.
 * 
 * Estes testes verificam todos os cenários possíveis quando um novo usuário
 * tenta se registrar no sistema. Cobrimos o caminho feliz (registro bem-sucedido)
 * e todos os caminhos de erro que precisamos tratar corretamente.
 */
describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
        const userData = {
            email: 'newuser@example.com',
            password: 'Test@123456',
            name: 'New User',
        };

        const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('expiresAt');

        expect(response.body.data.user).toMatchObject({
            email: userData.email.toLowerCase(),
            name: userData.name,
            role: 'USER',
        });

        expect(response.body.data.user).toHaveProperty('id');
        expect(response.body.data.user).not.toHaveProperty('password');

        expect(typeof response.body.data.token).toBe('string');
        expect(response.body.data.token.length).toBeGreaterThan(0);

        const userInDb = await prisma.user.findUnique({
            where: { email: userData.email.toLowerCase() },
        });

        expect(userInDb).toBeDefined();
        expect(userInDb?.email).toBe(userData.email.toLowerCase());
        expect(userInDb?.name).toBe(userData.name);
        expect(userInDb?.role).toBe('USER');
    });

    it('should return 409 if email already exists', async () => {
        const existingUser = await createTestUser({
            email: 'existing@example.com',
        });

        const response = await request(app)
        .post('/api/auth/register')
        .send({
            email: existingUser.email,
            password: 'Test@123456',
            name: 'Another User',
        })
        .expect(409);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('email');
        expect(response.body.message.toLowerCase()).toContain('already');
    });

    it('should return 400 if password is too weak', async () => {
        const weakPasswordData = {
            email: 'test@example.com',
            password: 'weak123',
            name: 'Test User',
        };

        const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 400 if email format is invalid', async () => {
        const invalidEmailData = {
            email: 'not-an-email',
            password: 'Test@123456',
            name: 'Test User',
        };

        const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });

    it('should return 400 if required fields are missing', async () => {
        const incompleteData = {
            email: 'test@example.com',
            password: 'Test@123456',
        };

        const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });

    it('should hash the password before saving to database', async () => {
        const userData = {
            email: 'hashtest@example.com',
            password: 'Test@123456',
            name: 'Hash Test User',
        };

        await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

        const userInDb = await prisma.user.findUnique({
            where: { email: userData.email.toLowerCase() },
        });

        expect(userInDb).toBeDefined();
        expect(userInDb?.password).not.toBe(userData.password);
        expect(userInDb?.password.length).toBeGreaterThan(50);
    });

    it('should convert email to lowercase', async () => {
        const userData = {
            email: 'MixedCase@Example.COM',
            password: 'Test@123456',
            name: 'Case Test User',
        };

        const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

        expect(response.body.data.user.email).toBe('mixedcase@example.com');

        const userInDb = await prisma.user.findUnique({
            where: { email: 'mixedcase@example.com' },
        });
        expect(userInDb).toBeDefined();
    });

    it('should create user with USER role by default', async () => {
        const userData = {
            email: 'roletest@example.com',
            password: 'Test@123456',
            name: 'Role Test User',
        };

        const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

        expect(response.body.data.user.role).toBe('USER');
    });
});