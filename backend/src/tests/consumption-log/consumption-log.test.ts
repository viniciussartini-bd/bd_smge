import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, createTestAdmin, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/consumption-logs', () => {
    it('should create consumption log as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        // Criar estrutura completa: plant -> area -> device
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

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const response = await request(app)
            .post('/api/consumption-logs')
            .set('Authorization', createAuthHeader(token))
            .send({
                consumption: 15.5,
                timestamp: new Date().toISOString(),
                source: 'MANUAL',
                deviceId: device.id,
                voltage: 220,
                current: 10,
                powerFactor: 0.9,
                temperature: 45,
                notes: 'Test reading',
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.consumption).toBe(15.5);
        expect(response.body.data.source).toBe('MANUAL');
        expect(response.body.data.deviceId).toBe(device.id);
    });

    it('should return 403 when non-admin tries to create', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        await request(app)
            .post('/api/consumption-logs')
            .set('Authorization', createAuthHeader(token))
            .send({
                consumption: 10,
                deviceId: device.id,
            })
            .expect(403);
    });

    it('should return 404 if device does not exist', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .post('/api/consumption-logs')
            .set('Authorization', createAuthHeader(token))
            .send({
                consumption: 10,
                deviceId: '00000000-0000-0000-0000-000000000000',
            })
            .expect(404);
    });

    it('should return 400 with negative consumption', async () => {
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

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        await request(app)
            .post('/api/consumption-logs')
            .set('Authorization', createAuthHeader(token))
            .send({
                consumption: -10,
                deviceId: device.id,
            })
            .expect(400);
    });

    it('should create log with default timestamp if not provided', async () => {
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

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const response = await request(app)
            .post('/api/consumption-logs')
            .set('Authorization', createAuthHeader(token))
            .send({
                consumption: 10,
                deviceId: device.id,
            })
            .expect(201);

        expect(response.body.data.timestamp).toBeDefined();
    });

    it('should accept different consumption sources', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000185',
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const sources = ['MANUAL', 'IOT', 'MODBUS', 'ETHERNET_IP', 'MQTT'];

        for (const source of sources) {
            const response = await request(app)
                .post('/api/consumption-logs')
                .set('Authorization', createAuthHeader(token))
                .send({
                    consumption: 10,
                    source,
                    deviceId: device.id,
                })
                .expect(201);

            expect(response.body.data.source).toBe(source);
        }
    });
});

describe('GET /api/consumption-logs', () => {
    it('should list all logs for authenticated user', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        await prisma.consumptionLog.create({
            data: {
                consumption: 10,
                timestamp: new Date(),
                source: 'MANUAL',
                deviceId: device.id,
            },
        });

        const response = await request(app)
            .get('/api/consumption-logs')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.logs).toHaveLength(1);
        expect(response.body.data.total).toBe(1);
    });

    it('should return 401 without authentication', async () => {
        await request(app).get('/api/consumption-logs').expect(401);
    });

    it('should filter logs by deviceId', async () => {
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

        const device1 = await prisma.device.create({
            data: {
                name: 'Device 1',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const device2 = await prisma.device.create({
            data: {
                name: 'Device 2',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        await prisma.consumptionLog.create({
            data: {
                consumption: 10,
                timestamp: new Date(),
                source: 'MANUAL',
                deviceId: device1.id,
            },
        });

        await prisma.consumptionLog.create({
            data: {
                consumption: 20,
                timestamp: new Date(),
                source: 'MANUAL',
                deviceId: device2.id,
            },
        });

        const response = await request(app)
            .get(`/api/consumption-logs?deviceId=${device1.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.logs).toHaveLength(1);
        expect(response.body.data.logs[0].deviceId).toBe(device1.id);
    });

    it('should filter logs by date range', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

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

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        // Criar log antigo
        await prisma.consumptionLog.create({
            data: {
                consumption: 10,
                timestamp: new Date('2024-01-01'),
                source: 'MANUAL',
                deviceId: device.id,
            },
        });

        // Criar log recente
        await prisma.consumptionLog.create({
            data: {
                consumption: 20,
                timestamp: new Date(),
                source: 'MANUAL',
                deviceId: device.id,
            },
        });

        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
        const endDate = new Date();

        const response = await request(app)
            .get(`/api/consumption-logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.logs).toHaveLength(1);
        expect(response.body.data.logs[0].consumption).toBe(20);
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
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 5000,
                plantId: plant.id,
            },
        });

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        // Criar 15 logs
        for (let i = 0; i < 15; i++) {
            await prisma.consumptionLog.create({
                data: {
                    consumption: 10 + i,
                    timestamp: new Date(Date.now() - i * 60000), // 1 minuto de diferença
                    source: 'MANUAL',
                    deviceId: device.id,
                },
            });
        }

        const response = await request(app)
            .get('/api/consumption-logs?page=2&limit=10')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.logs).toHaveLength(5);
        expect(response.body.data.page).toBe(2);
    });
});

describe('GET /api/consumption-logs/:id', () => {
    it('should get log by id', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000190',
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const log = await prisma.consumptionLog.create({
            data: {
                consumption: 15.5,
                timestamp: new Date(),
                source: 'MANUAL',
                deviceId: device.id,
                notes: 'Test note',
            },
        });

        const response = await request(app)
            .get(`/api/consumption-logs/${log.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(log.id);
        expect(response.body.data.consumption).toBe(15.5);
    });

    it('should return 404 for non-existent log', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/consumption-logs/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });
});

describe('GET /api/consumption-logs/stats', () => {
    it('should return consumption statistics', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000191',
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        // Criar múltiplos logs
        await prisma.consumptionLog.createMany({
            data: [
                { consumption: 10, timestamp: new Date(), source: 'MANUAL', deviceId: device.id },
                { consumption: 20, timestamp: new Date(), source: 'MANUAL', deviceId: device.id },
                { consumption: 30, timestamp: new Date(), source: 'MANUAL', deviceId: device.id },
            ],
        });

        const response = await request(app)
            .get(`/api/consumption-logs/stats?deviceId=${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalConsumption).toBe(60);
        expect(response.body.data.averageConsumption).toBe(20);
        expect(response.body.data.peakConsumption).toBe(30);
        expect(response.body.data.minConsumption).toBe(10);
        expect(response.body.data.readingsCount).toBe(3);
    });
});

describe('DELETE /api/consumption-logs/:id', () => {
    it('should delete log as admin', async () => {
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
                plantId: plant.id,
            },
        });

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const log = await prisma.consumptionLog.create({
            data: {
                consumption: 10,
                timestamp: new Date(),
                source: 'MANUAL',
                deviceId: device.id,
            },
        });

        await request(app)
            .delete(`/api/consumption-logs/${log.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.consumptionLog.findUnique({ where: { id: log.id } });
        expect(deleted).toBeNull();
    });

    it('should return 403 when non-admin tries to delete', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const log = await prisma.consumptionLog.create({
            data: {
                consumption: 10,
                timestamp: new Date(),
                source: 'MANUAL',
                deviceId: device.id,
            },
        });

        await request(app)
            .delete(`/api/consumption-logs/${log.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(403);
    });
});