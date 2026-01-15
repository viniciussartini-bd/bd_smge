import { prisma } from '../../config/database.config.js';
import { Device } from '@prisma/client';
import { CreateDeviceInput, UpdateDeviceInput } from './device.validators.js';
import { DeviceResponse, DeviceWithRelations } from './device.types.js';

/**
 * Repository responsável por todas as operações de banco de dados relacionadas a dispositivos.
 * 
 * Este repository encapsula toda a lógica de acesso a dados, permitindo que o service
 * trabalhe com objetos de domínio sem se preocupar com detalhes de persistência.
 */
export class DeviceRepository {
    /**
     * Cria um novo dispositivo no banco de dados.
     */
    async create(data: CreateDeviceInput): Promise<DeviceResponse> {
        return prisma.device.create({
            data: {
                name: data.name,
                model: data.model || null,
                brand: data.brand || null,
                workingVoltage: data.workingVoltage,
                power: data.power,
                usageTime: data.usageTime || 0,
                description: data.description || null,
                areaId: data.areaId,
                iotDeviceId: data.iotDeviceId || null,
                protocol: data.protocol || null,
                ipAddress: data.ipAddress || null,
                port: data.port || null,
                endpoint: data.endpoint || null,
                isConnected: false,
                lastConnection: null,
            },
        });
    }

    /**
     * Busca um dispositivo por ID.
     */
    async findById(id: string): Promise<DeviceResponse | null> {
        return prisma.device.findUnique({
            where: { id },
        });
    }

    /**
     * Busca um dispositivo por ID incluindo relacionamentos.
     */
    async findByIdWithRelations(id: string): Promise<DeviceWithRelations | null> {
        return prisma.device.findUnique({
            where: { id },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        plantId: true,
                        plant: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        }) as Promise<DeviceWithRelations | null>;
    }

    /**
     * Busca um dispositivo por iotDeviceId.
     * Útil para identificar dispositivos em integrações IoT.
     */
    async findByIotDeviceId(iotDeviceId: string): Promise<Device | null> {
        return prisma.device.findUnique({
            where: { iotDeviceId },
        });
    }

    /**
     * Lista todos os dispositivos com suporte a paginação e filtros.
     */
    async findAll(
        skip: number = 0,
        take: number = 10,
        areaId?: string,
        plantId?: string
    ): Promise<DeviceResponse[]> {
        const where: any = {};

        if (areaId) {
            where.areaId = areaId;
        }

        if (plantId) {
            where.area = {
                plantId: plantId,
            };
        }

        return prisma.device.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Lista dispositivos incluindo relacionamentos.
     */
    async findAllWithRelations(
        skip: number = 0,
        take: number = 10,
        areaId?: string,
        plantId?: string
    ): Promise<DeviceWithRelations[]> {
        const where: any = {};

        if (areaId) {
            where.areaId = areaId;
        }

        if (plantId) {
            where.area = {
                plantId: plantId,
            };
        }

        return prisma.device.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        plantId: true,
                        plant: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        }) as Promise<DeviceWithRelations[]>;
    }

    /**
     * Conta o total de dispositivos com filtros opcionais.
     */
    async count(areaId?: string, plantId?: string): Promise<number> {
        const where: any = {};

        if (areaId) {
            where.areaId = areaId;
        }

        if (plantId) {
            where.area = {
                plantId: plantId,
            };
        }

        return prisma.device.count({ where });
    }

    /**
     * Atualiza um dispositivo existente.
     */
    async update(id: string, data: UpdateDeviceInput): Promise<DeviceResponse> {
        return prisma.device.update({
            where: { id },
            data,
        });
    }

    /**
     * Deleta um dispositivo.
     */
    async delete(id: string): Promise<DeviceResponse> {
        return prisma.device.delete({
            where: { id },
        });
    }

    /**
     * Atualiza o status de conexão de um dispositivo IoT.
     */
    async updateConnectionStatus(
        id: string,
        isConnected: boolean,
        lastConnection?: Date
    ): Promise<DeviceResponse> {
        return prisma.device.update({
            where: { id },
            data: {
                isConnected,
                lastConnection: lastConnection || new Date(),
            },
        });
    }

    /**
     * Incrementa o contador de dispositivos registrados em uma área.
     */
    async incrementAreaDevicesCount(areaId: string): Promise<void> {
        await prisma.area.update({
            where: { id: areaId },
            data: { registeredDevicesCount: { increment: 1 } },
        });
    }

    /**
     * Decrementa o contador de dispositivos registrados em uma área.
     */
    async decrementAreaDevicesCount(areaId: string): Promise<void> {
        await prisma.area.update({
            where: { id: areaId },
            data: { registeredDevicesCount: { decrement: 1 } },
        });
    }
}

export const deviceRepository = new DeviceRepository();