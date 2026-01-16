import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, createTestAdmin, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/alerts', () => {
    it('should create consumption threshold alert as admin', async () => {
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
            .post('/api/alerts')
            .set('Authorization', createAuthHeader(token))
            .send({
                title: 'High Consumption Alert',
                message: 'Plant consumption exceeded 1000 kWh',
                type: 'consumption_threshold',
                severity: 'warning',
                threshold: 1000,
                comparisonType: 'greater_than',
                timeWindow: 'daily',
                plantId: plant.id,
                isActive: true,
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('High Consumption Alert');
        expect(response.body.data.threshold).toBe(1000);
        expect(response.body.data.plantId).toBe(plant.id);
    });

    it('should return 403 when non-admin tries to create alert', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .post('/api/alerts')
            .set('Authorization', createAuthHeader(token))
            .send({
                title: 'Test Alert',
                message: 'Test message',
                type: 'consumption_threshold',
                severity: 'info',
                threshold: 500,
                comparisonType: 'greater_than',
                timeWindow: 'daily',
            })
            .expect(403);
    });

    it('should return 400 if threshold alert missing required fields', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

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
            .post('/api/alerts')
            .set('Authorization', createAuthHeader(token))
            .send({
                title: 'Incomplete Alert',
                message: 'Missing threshold config',
                type: 'consumption_threshold',
                severity: 'warning',
                plantId: plant.id,
                // Missing: threshold, comparisonType, timeWindow
            })
            .expect(400);
    });

    it('should return 400 if no scope provided', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .post('/api/alerts')
            .set('Authorization', createAuthHeader(token))
            .send({
                title: 'No Scope Alert',
                message: 'Missing scope',
                type: 'consumption_threshold',
                severity: 'warning',
                threshold: 500,
                comparisonType: 'greater_than',
                timeWindow: 'daily',
                // Missing: plantId, areaId, or deviceId
            })
            .expect(400);
    });

    it('should create device offline alert without threshold', async () => {
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

        const response = await request(app)
            .post('/api/alerts')
            .set('Authorization', createAuthHeader(token))
            .send({
                title: 'Device Offline',
                message: 'Device has been offline for 1 hour',
                type: 'device_offline',
                severity: 'critical',
                deviceId: device.id,
            })
            .expect(201);

        expect(response.body.data.type).toBe('device_offline');
        expect(response.body.data.threshold).toBeNull();
    });
});

describe('GET /api/alerts', () => {
    it('should list all alerts for authenticated user', async () => {
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

        await prisma.alert.create({
            data: {
                title: 'Test Alert',
                message: 'Test message',
                type: 'consumption_threshold',
                severity: 'info',
                threshold: 500,
                comparisonType: 'greater_than',
                timeWindow: 'daily',
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get('/api/alerts')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.alerts).toHaveLength(1);
        expect(response.body.data.total).toBe(1);
    });

    it('should return 401 without authentication', async () => {
        await request(app).get('/api/alerts').expect(401);
    });

    it('should filter unread alerts only', async () => {
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

        await prisma.alert.create({
            data: {
                title: 'Read Alert',
                message: 'Already read',
                type: 'consumption_threshold',
                severity: 'info',
                isRead: true,
                userId: user.id,
                plantId: plant.id,
            },
        });

        await prisma.alert.create({
            data: {
                title: 'Unread Alert',
                message: 'Not read yet',
                type: 'consumption_threshold',
                severity: 'warning',
                isRead: false,
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get('/api/alerts?unreadOnly=true')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.alerts).toHaveLength(1);
        expect(response.body.data.alerts[0].isRead).toBe(false);
    });

    it('should filter by severity', async () => {
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

        await prisma.alert.create({
            data: {
                title: 'Critical Alert',
                message: 'Critical issue',
                type: 'consumption_threshold',
                severity: 'critical',
                userId: user.id,
                plantId: plant.id,
            },
        });

        await prisma.alert.create({
            data: {
                title: 'Info Alert',
                message: 'Just info',
                type: 'consumption_threshold',
                severity: 'info',
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get('/api/alerts?severity=critical')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.alerts).toHaveLength(1);
        expect(response.body.data.alerts[0].severity).toBe('critical');
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
            await prisma.alert.create({
                data: {
                    title: `Alert ${i}`,
                    message: `Message ${i}`,
                    type: 'consumption_threshold',
                    severity: 'info',
                    userId: user.id,
                    plantId: plant.id,
                },
            });
        }

        const response = await request(app)
            .get('/api/alerts?page=2&limit=20')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.alerts).toHaveLength(5);
        expect(response.body.data.page).toBe(2);
    });
});

describe('GET /api/alerts/:id', () => {
    it('should get alert by id', async () => {
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

        const alert = await prisma.alert.create({
            data: {
                title: 'Test Alert',
                message: 'Test message',
                type: 'consumption_threshold',
                severity: 'warning',
                threshold: 750,
                comparisonType: 'greater_than',
                timeWindow: 'daily',
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .get(`/api/alerts/${alert.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(alert.id);
        expect(response.body.data.threshold).toBe(750);
    });

    it('should return 404 for non-existent alert', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/alerts/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });

    it('should not allow user to see other users alerts', async () => {
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

        const alert = await prisma.alert.create({
            data: {
                title: 'User2 Alert',
                message: 'This belongs to user2',
                type: 'consumption_threshold',
                severity: 'info',
                userId: user2.id,
                plantId: plant.id,
            },
        });

        await request(app)
            .get(`/api/alerts/${alert.id}`)
            .set('Authorization', createAuthHeader(token1))
            .expect(403);
    });
});

describe('PATCH /api/alerts/:id/read', () => {
    it('should mark alert as read', async () => {
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

        const alert = await prisma.alert.create({
            data: {
                title: 'Unread Alert',
                message: 'Not read yet',
                type: 'consumption_threshold',
                severity: 'info',
                isRead: false,
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .patch(`/api/alerts/${alert.id}/read`)
            .set('Authorization', createAuthHeader(token))
            .send({ isRead: true })
            .expect(200);

        expect(response.body.data.isRead).toBe(true);
    });

    it('should mark alert as unread', async () => {
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

        const alert = await prisma.alert.create({
            data: {
                title: 'Read Alert',
                message: 'Already read',
                type: 'consumption_threshold',
                severity: 'info',
                isRead: true,
                userId: user.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .patch(`/api/alerts/${alert.id}/read`)
            .set('Authorization', createAuthHeader(token))
            .send({ isRead: false })
            .expect(200);

        expect(response.body.data.isRead).toBe(false);
    });
});

describe('PUT /api/alerts/:id', () => {
    it('should update alert as admin', async () => {
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

        const alert = await prisma.alert.create({
            data: {
                title: 'Original Title',
                message: 'Original message',
                type: 'consumption_threshold',
                severity: 'info',
                threshold: 500,
                userId: admin.id,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .put(`/api/alerts/${alert.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                title: 'Updated Title',
                threshold: 750,
                severity: 'warning',
            })
            .expect(200);

        expect(response.body.data.title).toBe('Updated Title');
        expect(response.body.data.threshold).toBe(750);
        expect(response.body.data.severity).toBe('warning');
    });

    it('should return 403 when non-admin tries to update', async () => {
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

        const alert = await prisma.alert.create({
            data: {
                title: 'Test Alert',
                message: 'Test message',
                type: 'consumption_threshold',
                severity: 'info',
                userId: user.id,
                plantId: plant.id,
            },
        });

        await request(app)
            .put(`/api/alerts/${alert.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({ title: 'Updated Title' })
            .expect(403);
    });
});

describe('DELETE /api/alerts/:id', () => {
    it('should delete alert as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

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

        const alert = await prisma.alert.create({
            data: {
                title: 'Test Alert',
                message: 'Test message',
                type: 'consumption_threshold',
                severity: 'info',
                userId: admin.id,
                plantId: plant.id,
            },
        });

        await request(app)
            .delete(`/api/alerts/${alert.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.alert.findUnique({ where: { id: alert.id } });
        expect(deleted).toBeNull();
    });

    it('should return 403 when non-admin tries to delete', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000195',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        const alert = await prisma.alert.create({
            data: {
                title: 'Test Alert',
                message: 'Test message',
                type: 'consumption_threshold',
                severity: 'info',
                userId: user.id,
                plantId: plant.id,
            },
        });

        await request(app)
            .delete(`/api/alerts/${alert.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(403);
    });
});

describe('GET /api/alerts/statistics', () => {
    it('should return alert statistics for user', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000196',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: user.id,
            },
        });

        await prisma.alert.createMany({
            data: [
                {
                    title: 'Alert 1',
                    message: 'Message 1',
                    type: 'consumption_threshold',
                    severity: 'critical',
                    isRead: false,
                    userId: user.id,
                    plantId: plant.id,
                },
                {
                    title: 'Alert 2',
                    message: 'Message 2',
                    type: 'device_offline',
                    severity: 'warning',
                    isRead: true,
                    userId: user.id,
                    plantId: plant.id,
                },
                {
                    title: 'Alert 3',
                    message: 'Message 3',
                    type: 'consumption_threshold',
                    severity: 'info',
                    isRead: false,
                    userId: user.id,
                    plantId: plant.id,
                },
            ],
        });

        const response = await request(app)
            .get('/api/alerts/statistics')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(3);
        expect(response.body.data.unread).toBe(2);
        expect(response.body.data.bySeverity).toBeDefined();
        expect(response.body.data.byType).toBeDefined();
    });
});