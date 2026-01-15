import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, createTestAdmin, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/areas', () => {
    it('should create area as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        // Primeiro criar uma planta
        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant for Area',
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
            .post('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Production Area',
                totalArea: 1500,
                description: 'Main production floor',
                plantId: plant.id,
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Production Area');
        expect(response.body.data.totalArea).toBe(1500);
        expect(response.body.data.description).toBe('Main production floor');
        expect(response.body.data.plantId).toBe(plant.id);
    });

    it('should return 403 when non-admin tries to create', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);
        const admin = await createTestAdmin();

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000182',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await request(app)
            .post('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            })
            .expect(403);
    });

    it('should return 404 if plant does not exist', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .post('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Area',
                totalArea: 1000,
                plantId: '00000000-0000-0000-0000-000000000000',
            })
            .expect(404);
    });

    it('should return 400 with invalid data', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000183',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await request(app)
            .post('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'A', // Nome muito curto
                totalArea: 1000,
                plantId: plant.id,
            })
            .expect(400);
    });

    it('should return 400 with negative total area', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000184',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await request(app)
            .post('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Area',
                totalArea: -100,
                plantId: plant.id,
            })
            .expect(400);
    });

    it('should create area without description', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000186',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const response = await request(app)
            .post('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Area Without Description',
                totalArea: 1000,
                plantId: plant.id,
            })
            .expect(201);

        expect(response.body.data.description).toBeNull();
    });

    it('should increment plant registeredAreasCount after creation', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000187',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                registeredAreasCount: 0,
                createdById: admin.id,
            },
        });

        await request(app)
            .post('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            })
            .expect(201);

        const updatedPlant = await prisma.plant.findUnique({ where: { id: plant.id } });
        expect(updatedPlant?.registeredAreasCount).toBe(1);
    });
});

describe('GET /api/areas', () => {
    it('should list all areas for authenticated user', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000188',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await prisma.area.create({
            data: {
                name: 'Area 1',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get('/api/areas')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.areas).toHaveLength(1);
        expect(response.body.data.total).toBe(1);
    });

    it('should return 401 without authentication', async () => {
        await request(app).get('/api/areas').expect(401);
    });

    it('should support pagination', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000189',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 50000,
                createdById: admin.id,
            },
        });

        // Criar 15 áreas
        for (let i = 0; i < 15; i++) {
            await prisma.area.create({
                data: {
                    name: `Area ${i}`,
                    totalArea: 1000,
                    plantId: plant.id,
                },
            });
        }

        const response = await request(app)
            .get('/api/areas?page=2&limit=10')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.areas).toHaveLength(5);
        expect(response.body.data.page).toBe(2);
    });

    it('should filter areas by plantId', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant1 = await prisma.plant.create({
            data: {
                name: 'Plant 1',
                cnpj: '11222333000190',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const plant2 = await prisma.plant.create({
            data: {
                name: 'Plant 2',
                cnpj: '11222333000191',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        await prisma.area.create({
            data: {
                name: 'Area Plant 1',
                totalArea: 1000,
                plantId: plant1.id,
            },
        });

        await prisma.area.create({
            data: {
                name: 'Area Plant 2',
                totalArea: 1000,
                plantId: plant2.id,
            },
        });

        const response = await request(app)
            .get(`/api/areas?plantId=${plant1.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.areas).toHaveLength(1);
        expect(response.body.data.areas[0].plantId).toBe(plant1.id);
    });
});

describe('GET /api/areas/:id', () => {
    it('should get area by id', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000192',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                description: 'Test Description',
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(area.id);
        expect(response.body.data.name).toBe('Test Area');
    });

    it('should return 404 for non-existent area', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/areas/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });
});

describe('PUT /api/areas/:id', () => {
    it('should update area as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000193',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Original Name',
                totalArea: 1000,
                description: 'Original Description',
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .put(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Updated Name',
                description: 'Updated Description',
            })
            .expect(200);

        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.description).toBe('Updated Description');
    });

    it('should return 403 when non-admin tries to update', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000194',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await request(app)
            .put(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({ name: 'Updated Name' })
            .expect(403);
    });

    it('should return 404 for non-existent area', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .put('/api/areas/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .send({ name: 'Updated Name' })
            .expect(404);
    });

    it('should return 400 with invalid update data', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000195',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await request(app)
            .put(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'U', // Nome muito curto
            })
            .expect(400);
    });
});

describe('DELETE /api/areas/:id', () => {
    it('should delete area as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000196',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await request(app)
            .delete(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.area.findUnique({ where: { id: area.id } });
        expect(deleted).toBeNull();
    });

    it('should return 403 when non-admin tries to delete', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000197',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await request(app)
            .delete(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(403);
    });

    it('should return 404 for non-existent area', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .delete('/api/areas/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });

    it('should return 409 when trying to delete area with devices', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000198',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
                registeredDevicesCount: 1,
            },
        });

        await request(app)
            .delete(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(409);
    });

    it('should decrement plant registeredAreasCount after deletion', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000199',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                registeredAreasCount: 1,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await request(app)
            .delete(`/api/areas/${area.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const updatedPlant = await prisma.plant.findUnique({ where: { id: plant.id } });
        expect(updatedPlant?.registeredAreasCount).toBe(0);
    });
});