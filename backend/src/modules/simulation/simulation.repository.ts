import { prisma } from '../../config/database.config.js';
import { Simulation } from '@prisma/client';
import { CreateSimulationInput, UpdateSimulationInput, SimulationType, SimulationScope } from './simulation.validators.js';
import { SimulationResponse, SimulationWithRelations } from './simulation.types.js';

export class SimulationRepository {
    async create(data: CreateSimulationInput, userId: string): Promise<SimulationResponse> {
        return prisma.simulation.create({
            data: {
                name: data.name,
                description: data.description || null,
                simulationType: data.simulationType,
                scope: data.scope,
                estimatedConsumption: data.estimatedConsumption,
                estimatedCost: data.estimatedCost,
                startDate: data.startDate,
                endDate: data.endDate,
                averageDailyUsage: data.averageDailyUsage || null,
                tariffUsed: data.tariffUsed,
                flagUsed: data.flagUsed || null,
                userId,
                plantId: data.plantId || null,
                areaId: data.areaId || null,
                deviceId: data.deviceId || null,
            },
        });
    }

    async findById(id: string): Promise<SimulationResponse | null> {
        return prisma.simulation.findUnique({ where: { id } });
    }

    async findByIdWithRelations(id: string): Promise<SimulationWithRelations | null> {
        return prisma.simulation.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true } },
                plant: { select: { id: true, name: true, cnpj: true } },
                area: { select: { id: true, name: true, plantId: true } },
                device: { select: { id: true, name: true, power: true, areaId: true } },
            },
        }) as Promise<SimulationWithRelations | null>;
    }

    async findByUser(
        userId: string,
        skip: number = 0,
        take: number = 20,
        filters?: {
            simulationType?: SimulationType;
            scope?: SimulationScope;
            plantId?: string;
            areaId?: string;
            deviceId?: string;
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<SimulationResponse[]> {
        const where: any = { userId };

        if (filters?.simulationType) where.simulationType = filters.simulationType;
        if (filters?.scope) where.scope = filters.scope;
        if (filters?.plantId) where.plantId = filters.plantId;
        if (filters?.areaId) where.areaId = filters.areaId;
        if (filters?.deviceId) where.deviceId = filters.deviceId;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        return prisma.simulation.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
        });
    }

    async countByUser(userId: string, filters?: any): Promise<number> {
        const where: any = { userId };
        if (filters?.simulationType) where.simulationType = filters.simulationType;
        if (filters?.scope) where.scope = filters.scope;
        if (filters?.plantId) where.plantId = filters.plantId;
        if (filters?.areaId) where.areaId = filters.areaId;
        if (filters?.deviceId) where.deviceId = filters.deviceId;

        return prisma.simulation.count({ where });
    }

    async update(id: string, data: UpdateSimulationInput): Promise<SimulationResponse> {
        return prisma.simulation.update({ where: { id }, data });
    }

    async delete(id: string): Promise<SimulationResponse> {
        return prisma.simulation.delete({ where: { id } });
    }

    async getStatsByType(userId: string): Promise<{ type: string; count: number }[]> {
        const result = await prisma.simulation.groupBy({
            by: ['simulationType'],
            where: { userId },
            _count: true,
        });
        return result.map((item) => ({ type: item.simulationType, count: item._count }));
    }

    async getStatsByScope(userId: string): Promise<{ scope: string; count: number }[]> {
        const result = await prisma.simulation.groupBy({
            by: ['scope'],
            where: { userId },
            _count: true,
        });
        return result.map((item) => ({ scope: item.scope, count: item._count }));
    }

    async findRecent(userId: string, limit: number = 10): Promise<SimulationResponse[]> {
        return prisma.simulation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async getTotalEstimatedCost(userId: string): Promise<number> {
        const result = await prisma.simulation.aggregate({
            where: { userId },
            _sum: { estimatedCost: true },
        });
        return result._sum.estimatedCost || 0;
    }

    async getAverageVariance(userId: string): Promise<number | null> {
        const result = await prisma.simulation.aggregate({
            where: { userId, variance: { not: null } },
            _avg: { variance: true },
        });
        return result._avg.variance;
    }

    async findWithRealData(userId: string): Promise<Simulation[]> {
        return prisma.simulation.findMany({
            where: { userId, realConsumption: { not: null } },
        });
    }
}

export const simulationRepository = new SimulationRepository();