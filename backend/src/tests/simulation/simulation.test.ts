import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/simulations', () => {
    it('should create simulation for plant as user', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000181',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        const response = await request(app)
            .post('/api/simulations')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Monthly Cost Projection',
                description: 'Projecting costs for next month',
                simulationType: 'cost_estimation',
                scope: 'plant',
                estimatedConsumption: 5000,
                estimatedCost: 3750,
                startDate: '2025-02-01',
                endDate: '2025-02-28',
                tariffUsed: 0.75,
                plantId: plant.id,
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Monthly Cost Projection');
        expect(response.body.data.estimatedConsumption).toBe(5000);
        expect(response.body.data.plantId).toBe(plant.id);
    });

    it('should return 400 if scope does not match provided ID', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000182',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        await request(app)
            .post('/api/simulations')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Invalid Simulation',
                simulationType: 'cost_estimation',
                scope: 'area', // Scope is area but plantId provided
                estimatedConsumption: 1000,
                estimatedCost: 750,
                startDate: '2025-02-01',
                endDate: '2025-02-28',
                tariffUsed: 0.75,
                plantId: plant.id,
            })
            .expect(400);
    });

    it('should return 400 if start date is after end date', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000183',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        await request(app)
            .post('/api/simulations')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Invalid Dates',
                simulationType: 'cost_estimation',
                scope: 'plant',
                estimatedConsumption: 1000,
                estimatedCost: 750,
                startDate: '2025-02-28',
                endDate: '2025-02-01',
                tariffUsed: 0.75,
                plantId: plant.id,
            })
            .expect(400);
    });

    it('should create simulation for device', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000184',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const device = await prisma.device.create({
            data: {
                name: 'Industrial Motor',
                workingVoltage: 380,
                power: 15000,
                usageTime: 8,
                areaId: area.id,
            },
        });

        const response = await request(app)
            .post('/api/simulations')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Device Consumption Projection',
                simulationType: 'consumption_projection',
                scope: 'device',
                estimatedConsumption: 3600,
                estimatedCost: 2700,
                startDate: '2025-02-01',
                endDate: '2025-02-28',
                averageDailyUsage: 8,
                tariffUsed: 0.75,
                deviceId: device.id,
            })
            .expect(201);

        expect(response.body.data.deviceId).toBe(device.id);
        expect(response.body.data.averageDailyUsage).toBe(8);
    });
});

describe('GET /api/simulations', () => {
    it('should list all simulations for authenticated user', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000185',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        await prisma.simulation.create({
            data: {
                name: 'Test Simulation',
                simulationType: 'cost_estimation',
                scope: 'plant',
                estimatedConsumption: 5000,
                estimatedCost: 3750,
                startDate: new Date('2025-02-01'),
                endDate: new Date('2025-02-28'),
                tariffUsed: 0.75,
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get('/api/simulations')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.simulations).toHaveLength(1);
        expect(response.body.data.total).toBe(1);
    });

    it('should filter by simulation type', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000186',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        await prisma.simulation.createMany({
            data: [
                {
                    name: 'Cost Simulation',
                    simulationType: 'cost_estimation',
                    scope: 'plant',
                    estimatedConsumption: 5000,
                    estimatedCost: 3750,
                    startDate: new Date('2025-02-01'),
                    endDate: new Date('2025-02-28'),
                    tariffUsed: 0.75,
                    userId: user.id,
                    plantId: plant.id,
                },
                {
                    name: 'Projection Simulation',
                    simulationType: 'consumption_projection',
                    scope: 'plant',
                    estimatedConsumption: 6000,
                    estimatedCost: 4500,
                    startDate: new Date('2025-03-01'),
                    endDate: new Date('2025-03-31'),
                    tariffUsed: 0.75,
                    userId: user.id,
                    plantId: plant.id,
                },
            ],
        });

        const response = await request(app)
            .get('/api/simulations?simulationType=cost_estimation')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.simulations).toHaveLength(1);
        expect(response.body.data.simulations[0].simulationType).toBe('cost_estimation');
    });

    it('should support pagination', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000187',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        for (let i = 0; i < 25; i++) {
            await prisma.simulation.create({
                data: {
                    name: `Simulation ${i}`,
                    simulationType: 'cost_estimation',
                    scope: 'plant',
                    estimatedConsumption: 1000,
                    estimatedCost: 750,
                    startDate: new Date('2025-02-01'),
                    endDate: new Date('2025-02-28'),
                    tariffUsed: 0.75,
                    userId: user.id,
                    plantId: plant.id,
                },
            });
        }

        const response = await request(app)
            .get('/api/simulations?page=2&limit=20')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.simulations).toHaveLength(5);
        expect(response.body.data.page).toBe(2);
    });
});

describe('GET /api/simulations/:id', () => {
    it('should get simulation by id', async () => {
        const user = await createTestUser();
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
                createdById: user.id,
            },
        });

        const simulation = await prisma.simulation.create({
            data: {
                name: 'Detailed Simulation',
                description: 'With full details',
                simulationType: 'scenario_comparison',
                scope: 'plant',
                estimatedConsumption: 8000,
                estimatedCost: 6000,
                startDate: new Date('2025-02-01'),
                endDate: new Date('2025-02-28'),
                tariffUsed: 0.75,
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get(`/api/simulations/${simulation.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(simulation.id);
        expect(response.body.data.name).toBe('Detailed Simulation');
    });

    it('should return 404 for non-existent simulation', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/simulations/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });

    it('should not allow user to see other users simulations', async () => {
        const user1 = await createTestUser({ email: 'user1@test.com' });
        const user2 = await createTestUser({ email: 'user2@test.com' });
        const token1 = generateTestToken(user1);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000189',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user2.id,
            },
        });

        const simulation = await prisma.simulation.create({
            data: {
                name: 'User2 Simulation',
                simulationType: 'cost_estimation',
                scope: 'plant',
                estimatedConsumption: 1000,
                estimatedCost: 750,
                startDate: new Date('2025-02-01'),
                endDate: new Date('2025-02-28'),
                tariffUsed: 0.75,
                userId: user2.id,
                plantId: plant.id,
            },
        });

        await request(app)
            .get(`/api/simulations/${simulation.id}`)
            .set('Authorization', createAuthHeader(token1))
            .expect(403);
    });
});

describe('PUT /api/simulations/:id', () => {
    it('should update simulation', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000190',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        const simulation = await prisma.simulation.create({
            data: {
                name: 'Original Name',
                simulationType: 'cost_estimation',
                scope: 'plant',
                estimatedConsumption: 5000,
                estimatedCost: 3750,
                startDate: new Date('2025-02-01'),
                endDate: new Date('2025-02-28'),
                tariffUsed: 0.75,
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .put(`/api/simulations/${simulation.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Updated Name',
                estimatedConsumption: 6000,
                estimatedCost: 4500,
            })
            .expect(200);

        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.estimatedConsumption).toBe(6000);
    });

    it('should update with real consumption and calculate variance', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000191',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        const simulation = await prisma.simulation.create({
            data: {
                name: 'Test Simulation',
                simulationType: 'cost_estimation',
                scope: 'plant',
                estimatedConsumption: 5000,
                estimatedCost: 3750,
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-31'),
                tariffUsed: 0.75,
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .put(`/api/simulations/${simulation.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                realConsumption: 5500,
                variance: 10, // (5500 - 5000) / 5000 * 100 = 10%
            })
            .expect(200);

        expect(response.body.data.realConsumption).toBe(5500);
        expect(response.body.data.variance).toBe(10);
    });
});

describe('DELETE /api/simulations/:id', () => {
    it('should delete simulation', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000192',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        const simulation = await prisma.simulation.create({
            data: {
                name: 'To Delete',
                simulationType: 'cost_estimation',
                scope: 'plant',
                estimatedConsumption: 1000,
                estimatedCost: 750,
                startDate: new Date('2025-02-01'),
                endDate: new Date('2025-02-28'),
                tariffUsed: 0.75,
                userId: user.id,
                plantId: plant.id,
            },
        });

        await request(app)
            .delete(`/api/simulations/${simulation.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.simulation.findUnique({ where: { id: simulation.id } });
        expect(deleted).toBeNull();
    });
});

describe('GET /api/simulations/statistics', () => {
    it('should return simulation statistics', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000193',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        await prisma.simulation.createMany({
            data: [
                {
                    name: 'Simulation 1',
                    simulationType: 'cost_estimation',
                    scope: 'plant',
                    estimatedConsumption: 5000,
                    estimatedCost: 3750,
                    startDate: new Date('2025-02-01'),
                    endDate: new Date('2025-02-28'),
                    tariffUsed: 0.75,
                    userId: user.id,
                    plantId: plant.id,
                },
                {
                    name: 'Simulation 2',
                    simulationType: 'consumption_projection',
                    scope: 'plant',
                    estimatedConsumption: 6000,
                    estimatedCost: 4500,
                    startDate: new Date('2025-03-01'),
                    endDate: new Date('2025-03-31'),
                    tariffUsed: 0.75,
                    userId: user.id,
                    plantId: plant.id,
                },
            ],
        });

        const response = await request(app)
            .get('/api/simulations/statistics')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(2);
        expect(response.body.data.totalEstimatedCost).toBe(8250);
    });
});