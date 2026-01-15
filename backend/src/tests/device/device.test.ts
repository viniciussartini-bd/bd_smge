import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, createTestAdmin, generateTestToken, createAuthHeader } from '../helpers.js';

describe('POST /api/devices', () => {
    it('should create device as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        // Criar planta e área primeiro
        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant for Device',
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

        const response = await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Industrial Motor',
                model: 'WEG W22',
                brand: 'WEG',
                workingVoltage: 380,
                power: 15000,
                usageTime: 8,
                description: 'Main production motor',
                areaId: area.id,
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Industrial Motor');
        expect(response.body.data.model).toBe('WEG W22');
        expect(response.body.data.workingVoltage).toBe(380);
        expect(response.body.data.power).toBe(15000);
        expect(response.body.data.usageTime).toBe(8);
        expect(response.body.data.areaId).toBe(area.id);
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

        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            })
            .expect(403);
    });

    it('should return 404 if area does not exist', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: '00000000-0000-0000-0000-000000000000',
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

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'D', // Nome muito curto
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            })
            .expect(400);
    });

    it('should return 400 with negative power', async () => {
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

        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Device',
                workingVoltage: 220,
                power: -1000,
                areaId: area.id,
            })
            .expect(400);
    });

    it('should return 400 with usage time exceeding 24 hours', async () => {
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

        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                usageTime: 25,
                areaId: area.id,
            })
            .expect(400);
    });

    it('should create device with IoT fields', async () => {
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

        const area = await prisma.area.create({
            data: {
                name: 'Test Area',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const response = await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'IoT Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
                iotDeviceId: 'IOT-001',
                protocol: 'MQTT',
                ipAddress: '192.168.1.100',
                port: 1883,
                endpoint: '/api/v1/readings',
            })
            .expect(201);

        expect(response.body.data.iotDeviceId).toBe('IOT-001');
        expect(response.body.data.protocol).toBe('MQTT');
        expect(response.body.data.ipAddress).toBe('192.168.1.100');
        expect(response.body.data.port).toBe(1883);
        expect(response.body.data.isConnected).toBe(false);
    });

    it('should return 409 if iotDeviceId already exists', async () => {
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

        // Criar primeiro dispositivo
        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'First Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
                iotDeviceId: 'IOT-DUPLICATE',
            })
            .expect(201);

        // Tentar criar segundo dispositivo com mesmo iotDeviceId
        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Second Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
                iotDeviceId: 'IOT-DUPLICATE',
            })
            .expect(409);
    });

    it('should increment area registeredDevicesCount after creation', async () => {
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
                registeredDevicesCount: 0,
            },
        });

        await request(app)
            .post('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            })
            .expect(201);

        const updatedArea = await prisma.area.findUnique({ where: { id: area.id } });
        expect(updatedArea?.registeredDevicesCount).toBe(1);
    });
});

describe('GET /api/devices', () => {
    it('should list all devices for authenticated user', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const token = generateTestToken(user);

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
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await prisma.device.create({
            data: {
                name: 'Device 1',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const response = await request(app)
            .get('/api/devices')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.devices).toHaveLength(1);
        expect(response.body.data.total).toBe(1);
    });

    it('should return 401 without authentication', async () => {
        await request(app).get('/api/devices').expect(401);
    });

    it('should support pagination', async () => {
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
                totalArea: 5000,
                plantId: plant.id,
            },
        });

        // Criar 15 dispositivos
        for (let i = 0; i < 15; i++) {
            await prisma.device.create({
                data: {
                    name: `Device ${i}`,
                    workingVoltage: 220,
                    power: 1000,
                    areaId: area.id,
                },
            });
        }

        const response = await request(app)
            .get('/api/devices?page=2&limit=10')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.devices).toHaveLength(5);
        expect(response.body.data.page).toBe(2);
    });

    it('should filter devices by areaId', async () => {
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

        const area1 = await prisma.area.create({
            data: {
                name: 'Area 1',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        const area2 = await prisma.area.create({
            data: {
                name: 'Area 2',
                totalArea: 1000,
                plantId: plant.id,
            },
        });

        await prisma.device.create({
            data: {
                name: 'Device Area 1',
                workingVoltage: 220,
                power: 1000,
                areaId: area1.id,
            },
        });

        await prisma.device.create({
            data: {
                name: 'Device Area 2',
                workingVoltage: 220,
                power: 1000,
                areaId: area2.id,
            },
        });

        const response = await request(app)
            .get(`/api/devices?areaId=${area1.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.devices).toHaveLength(1);
        expect(response.body.data.devices[0].areaId).toBe(area1.id);
    });

    it('should filter devices by plantId', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant1 = await prisma.plant.create({
            data: {
                name: 'Plant 1',
                cnpj: '11222333000192',
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
                cnpj: '11222333000193',
                zipCode: '12345678',
                address: 'Test Address',
                city: 'Test City',
                state: 'SP',
                totalArea: 5000,
                createdById: admin.id,
            },
        });

        const area1 = await prisma.area.create({
            data: {
                name: 'Area Plant 1',
                totalArea: 1000,
                plantId: plant1.id,
            },
        });

        const area2 = await prisma.area.create({
            data: {
                name: 'Area Plant 2',
                totalArea: 1000,
                plantId: plant2.id,
            },
        });

        await prisma.device.create({
            data: {
                name: 'Device Plant 1',
                workingVoltage: 220,
                power: 1000,
                areaId: area1.id,
            },
        });

        await prisma.device.create({
            data: {
                name: 'Device Plant 2',
                workingVoltage: 220,
                power: 1000,
                areaId: area2.id,
            },
        });

        const response = await request(app)
            .get(`/api/devices?plantId=${plant1.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.devices).toHaveLength(1);
        expect(response.body.data.devices[0].name).toBe('Device Plant 1');
    });
});

describe('GET /api/devices/:id', () => {
    it('should get device by id', async () => {
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
                model: 'Model X',
                brand: 'Brand Y',
                workingVoltage: 380,
                power: 5000,
                usageTime: 10,
                description: 'Test Description',
                areaId: area.id,
            },
        });

        const response = await request(app)
            .get(`/api/devices/${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(device.id);
        expect(response.body.data.name).toBe('Test Device');
        expect(response.body.data.model).toBe('Model X');
    });

    it('should return 404 for non-existent device', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/devices/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });
});

describe('PUT /api/devices/:id', () => {
    it('should update device as admin', async () => {
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

        const device = await prisma.device.create({
            data: {
                name: 'Original Name',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        const response = await request(app)
            .put(`/api/devices/${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                name: 'Updated Name',
                model: 'New Model',
                power: 2000,
            })
            .expect(200);

        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.model).toBe('New Model');
        expect(response.body.data.power).toBe(2000);
    });

    it('should return 403 when non-admin tries to update', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
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
            .put(`/api/devices/${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({ name: 'Updated Name' })
            .expect(403);
    });

    it('should return 404 for non-existent device', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .put('/api/devices/00000000-0000-0000-0000-000000000000')
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        await request(app)
            .put(`/api/devices/${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                power: -1000, // Potência negativa
            })
            .expect(400);
    });

    it('should return 409 when updating to duplicate iotDeviceId', async () => {
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
            },
        });

        // Criar primeiro dispositivo com iotDeviceId
        await prisma.device.create({
            data: {
                name: 'Device 1',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
                iotDeviceId: 'IOT-EXISTING',
            },
        });

        // Criar segundo dispositivo
        const device2 = await prisma.device.create({
            data: {
                name: 'Device 2',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        // Tentar atualizar segundo dispositivo com iotDeviceId existente
        await request(app)
            .put(`/api/devices/${device2.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                iotDeviceId: 'IOT-EXISTING',
            })
            .expect(409);
    });
});

describe('DELETE /api/devices/:id', () => {
    it('should delete device as admin', async () => {
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
            .delete(`/api/devices/${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.device.findUnique({ where: { id: device.id } });
        expect(deleted).toBeNull();
    });

    it('should return 403 when non-admin tries to delete', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000200',
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
            .delete(`/api/devices/${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(403);
    });

    it('should return 404 for non-existent device', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        await request(app)
            .delete('/api/devices/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });

    it('should decrement area registeredDevicesCount after deletion', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000201',
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

        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
            },
        });

        await request(app)
            .delete(`/api/devices/${device.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const updatedArea = await prisma.area.findUnique({ where: { id: area.id } });
        expect(updatedArea?.registeredDevicesCount).toBe(0);
    });
});

describe('GET /api/devices/:id/estimated-consumption', () => {
    it('should calculate estimated consumption correctly', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000202',
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

        // Criar dispositivo: 1000W, 8h/dia
        // Consumo diário: (1000 * 8) / 1000 = 8 kWh
        const device = await prisma.device.create({
            data: {
                name: 'Test Device',
                workingVoltage: 220,
                power: 1000,
                usageTime: 8,
                areaId: area.id,
            },
        });

        const response = await request(app)
            .get(`/api/devices/${device.id}/estimated-consumption`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.daily).toBe(8);
        expect(response.body.data.monthly).toBe(240);
        expect(response.body.data.annual).toBe(2920);
    });

    it('should return 404 for non-existent device', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/devices/00000000-0000-0000-0000-000000000000/estimated-consumption')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });
});

describe('PATCH /api/devices/:id/connection-status', () => {
    it('should update connection status as admin', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000203',
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
                name: 'IoT Device',
                workingVoltage: 220,
                power: 1000,
                areaId: area.id,
                iotDeviceId: 'IOT-001',
                isConnected: false,
            },
        });

        const response = await request(app)
            .patch(`/api/devices/${device.id}/connection-status`)
            .set('Authorization', createAuthHeader(token))
            .send({ isConnected: true })
            .expect(200);

        expect(response.body.data.isConnected).toBe(true);
        expect(response.body.data.lastConnection).toBeDefined();
    });

    it('should return 403 when non-admin tries to update connection status', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const token = generateTestToken(user);

        const plant = await prisma.plant.create({
            data: {
                name: 'Test Plant',
                cnpj: '11222333000204',
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
            .patch(`/api/devices/${device.id}/connection-status`)
            .set('Authorization', createAuthHeader(token))
            .send({ isConnected: true })
            .expect(403);
    });
});