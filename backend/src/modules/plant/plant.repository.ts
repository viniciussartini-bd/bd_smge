import { prisma } from '../../config/database.config.js';
import { Plant } from '@prisma/client';
import { CreatePlantInput, UpdatePlantInput } from './plant.validators.js';
import { PlantResponse, PlantWithRelations } from './plant.types.js';

export class PlantRepository {
    async create(data: CreatePlantInput, createdById: string): Promise<PlantResponse> {
        return prisma.plant.create({
            data: {
                name: data.name,
                cnpj: data.cnpj,
                zipCode: data.zipCode,
                address: data.address,
                city: data.city,
                state: data.state,
                totalArea: data.totalArea,
                energyCompanyId: data.energyCompanyId || null,
                createdById,
            },
        });
    }

    async findById(id: string): Promise<PlantResponse | null> {
        return prisma.plant.findUnique({
            where: { id },
        });
    }

    async findByIdWithRelations(id: string): Promise<PlantWithRelations | null> {
        return prisma.plant.findUnique({
            where: { id },
            include: {
                energyCompany: {
                    select: {
                        id: true,
                        name: true,
                        tariffKwh: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    async findByCNPJ(cnpj: string): Promise<Plant | null> {
        return prisma.plant.findUnique({
            where: { cnpj },
        });
    }

    async findAll(skip: number = 0, take: number = 10): Promise<PlantResponse[]> {
        return prisma.plant.findMany({
            skip,
            take,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAllWithRelations(skip: number = 0, take: number = 10): Promise<PlantWithRelations[]> {
        return prisma.plant.findMany({
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                energyCompany: {
                    select: {
                        id: true,
                        name: true,
                        tariffKwh: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    async update(id: string, data: UpdatePlantInput): Promise<PlantResponse> {
        return prisma.plant.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<PlantResponse> {
        return prisma.plant.delete({
            where: { id },
        });
    }

    async count(): Promise<number> {
        return prisma.plant.count();
    }

    async incrementAreasCount(plantId: string): Promise<void> {
        await prisma.plant.update({
            where: { id: plantId },
            data: { registeredAreasCount: { increment: 1 } },
        });
    }

    async decrementAreasCount(plantId: string): Promise<void> {
        await prisma.plant.update({
            where: { id: plantId },
            data: { registeredAreasCount: { decrement: 1 } },
        });
    }

    async updateTotalConsumption(plantId: string, consumption: number): Promise<void> {
        await prisma.plant.update({
            where: { id: plantId },
            data: { totalConsumption: consumption },
        });
    }
}

export const plantRepository = new PlantRepository();