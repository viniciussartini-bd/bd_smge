import { prisma } from '../../config/database.config.js';
import { Area } from '@prisma/client';
import type { CreateAreaInput, UpdateAreaInput } from './area.validators.js';

export class AreaRepository {
    async create(data: CreateAreaInput): Promise<Area> {
        return prisma.area.create({
            data: {
                name: data.name,
                totalArea: data.totalArea,
                description: data.description,
                plantId: data.plantId,
            },
        });
    }

    async findById(id: string, includeRelations = false): Promise<Area | null> {
        return prisma.area.findUnique({
            where: { id },
            include: includeRelations ? {
                plant: { select: { id: true, name: true, cnpj: true } },
                devices: { select: { id: true, name: true, power: true } },
            } : undefined,
        });
    }

    async findMany(page: number, limit: number, plantId?: string): Promise<{ areas: Area[]; total: number }> {
        const where = plantId ? { plantId } : {};
        const [areas, total] = await Promise.all([
            prisma.area.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.area.count({ where }),
        ]);
        return { areas, total };
    }

    async update(id: string, data: UpdateAreaInput): Promise<Area> {
        return prisma.area.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<Area> {
        return prisma.area.delete({
            where: { id },
        });
    }

    async incrementDevicesCount(id: string): Promise<void> {
        await prisma.area.update({
            where: { id },
            data: { registeredDevicesCount: { increment: 1 } },
        });
    }

    async decrementDevicesCount(id: string): Promise<void> {
        await prisma.area.update({
            where: { id },
            data: { registeredDevicesCount: { decrement: 1 } },
        });
    }

    async updateTotalConsumption(id: string, consumption: number): Promise<void> {
        await prisma.area.update({
            where: { id },
            data: { totalConsumption: consumption },
        });
    }
}

export const areaRepository = new AreaRepository();