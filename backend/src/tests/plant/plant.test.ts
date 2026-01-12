import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, createTestAdmin, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/plants', () => {
    it('should create plant as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const response = await request(app)
            .post('/api/plants')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Test Address, 123',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Test Plant');
        expect(response.body.data.cnpj).toBe('11222333000181');
    });

    it('should return 403 when non-admin tries to create', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .post('/api/plants')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
            })
            .expect(403);
    });

    it('should return 409 if CNPJ already exists', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await prisma.plant.create({
            data: {
                name: 'Existing Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Address',
                city: 'City',
                state: 'SP',
                totalArea: 1000,
                createdById: admin.id,
            },
        });

        await request(app)
            .post('/api/plants')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'New Plant',
                cnpj: '11222333000181',
                zipCode: '87654321',
                address: 'Another Address',
                city: 'Another City',
                state: 'RJ',
                totalArea: 2000,
            })
            .expect(409);
    });

    it('should return 400 with invalid CNPJ', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .post('/api/plants')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Plant',
                cnpj: '11111111111111',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
            })
            .expect(400);
    });
});

describe('GET /api/plants', () => {
    it('should list all plants for authenticated user', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const token = generateTestToken(user);

        await prisma.plant.create({
            data: {
                name: 'Plant 1',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Address 1',
                city: 'City 1',
                state: 'SP',
                totalArea: 1000,
                createdById: admin.id,
            },
        });

        const response = await request(app)
            .get('/api/plants')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.plants).toHaveLength(1);
        expect(response.body.data.total).toBe(1);
    });

    it('should return 401 without authentication', async () => {
        await request(app).get('/api/plants').expect(401);
    });

    it('should support pagination', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        // Criar 15 plantas com CNPJs válidos diferentes
        for (let i = 0; i < 15; i++) {
            // Gerando CNPJs diferentes baseados no índice
            const cnpjBase = `1122233300${String(i).padStart(4, '0')}`;
            await prisma.plant.create({
                data: {
                    name: `Plant ${i}`,
                    cnpj: cnpjBase,
                    zipCode: '12345678',
                    address: `Address ${i}`,
                    city: `City ${i}`,
                    state: 'SP',
                    totalArea: 1000,
                    createdById: admin.id,
                },
            });
        }

        const response = await request(app)
            .get('/api/plants?page=2&limit=10')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.plants).toHaveLength(5);
        expect(response.body.data.page).toBe(2);
    });
});

describe('GET /api/plants/:id', () => {
    it('should get plant by id', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const response = await request(app)
            .get(`/api/plants/${plant.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(plant.id);
        expect(response.body.data.name).toBe('Test Plant');
    });

    it('should return 404 for non-existent plant', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/plants/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });
});

describe('PUT /api/plants/:id', () => {
    it('should update plant as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Original Name',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Original Address',
                city: 'Original City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const response = await request(app)
            .put(`/api/plants/${plant.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Updated Name',
                city: 'Updated City',
            })
            .expect(200);

        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.city).toBe('Updated City');
    });

    it('should return 403 when non-admin tries to update', async () => {
        const admin = await createTestAdmin();
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Address',
                city: 'City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await request(app)
            .put(`/api/plants/${plant.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({ name: 'Updated Name' })
            .expect(403);
    });
});

describe('DELETE /api/plants/:id', () => {
    it('should delete plant as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Address',
                city: 'City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await request(app)
            .delete(`/api/plants/${plant.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.plant.findUnique({ where: { id: plant.id } });
        expect(deleted).toBeNull();
    });

    it('should return 403 when non-admin tries to delete', async () => {
        const admin = await createTestAdmin();
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Address',
                city: 'City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await request(app)
            .delete(`/api/plants/${plant.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(403);
    });

    it('should return 409 when trying to delete plant with areas', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Address',
                city: 'City',
                state: 'SP',
                totalArea: 5000,
                registeredAreasCount: 1,
                createdById: admin.id,
            },
        });

        await request(app)
            .delete(`/api/plants/${plant.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(409);
    });
});