import { prisma } from '../../config/database.config.js';
import { EnergyCompany } from '@prisma/client';
import { CreateEnergyCompanyInput, UpdateEnergyCompanyInput } from './energy-company.validators.js';
import { EnergyCompanyResponse, EnergyCompanyWithRelations } from './energy-company.types.js';

/**
 * Repository responsável por todas as operações de banco de dados relacionadas a companhias de energia.
 * 
 * Este repository encapsula toda a lógica de acesso a dados das distribuidoras de energia,
 * permitindo que o service trabalhe com objetos de domínio sem se preocupar com detalhes
 * de persistência.
 */
export class EnergyCompanyRepository {
    /**
     * Cria uma nova companhia de energia no banco de dados.
     */
    async create(data: CreateEnergyCompanyInput): Promise<EnergyCompanyResponse> {
        return prisma.energyCompany.create({
            data: {
                name: data.name,
                cnpj: data.cnpj,
                phone: data.phone || null,
                email: data.email || null,
                tariffKwh: data.tariffKwh,
                tariffPeakKwh: data.tariffPeakKwh || null,
                peakStartTime: data.peakStartTime || null,
                peakEndTime: data.peakEndTime || null,
                greenFlagValue: data.greenFlagValue,
                yellowFlagValue: data.yellowFlagValue,
                redFlag1Value: data.redFlag1Value,
                redFlag2Value: data.redFlag2Value,
                currentFlag: data.currentFlag,
            },
        });
    }

    /**
     * Busca uma companhia por ID.
     */
    async findById(id: string): Promise<EnergyCompanyResponse | null> {
        return prisma.energyCompany.findUnique({
            where: { id },
        });
    }

    /**
     * Busca uma companhia por ID incluindo relacionamentos.
     */
    async findByIdWithRelations(id: string): Promise<EnergyCompanyWithRelations | null> {
        return prisma.energyCompany.findUnique({
            where: { id },
            include: {
                plants: {
                    select: {
                        id: true,
                        name: true,
                        cnpj: true,
                        city: true,
                        state: true,
                    },
                },
            },
        }) as Promise<EnergyCompanyWithRelations | null>;
    }

    /**
     * Busca uma companhia por CNPJ.
     */
    async findByCNPJ(cnpj: string): Promise<EnergyCompany | null> {
        return prisma.energyCompany.findUnique({
            where: { cnpj },
        });
    }

    /**
     * Lista todas as companhias com suporte a paginação.
     */
    async findAll(skip: number = 0, take: number = 10): Promise<EnergyCompanyResponse[]> {
        return prisma.energyCompany.findMany({
            skip,
            take,
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Lista companhias incluindo relacionamentos.
     */
    async findAllWithRelations(skip: number = 0, take: number = 10): Promise<EnergyCompanyWithRelations[]> {
        return prisma.energyCompany.findMany({
            skip,
            take,
            orderBy: { name: 'asc' },
            include: {
                plants: {
                    select: {
                        id: true,
                        name: true,
                        cnpj: true,
                        city: true,
                        state: true,
                    },
                },
            },
        }) as Promise<EnergyCompanyWithRelations[]>;
    }

    /**
     * Conta o total de companhias.
     */
    async count(): Promise<number> {
        return prisma.energyCompany.count();
    }

    /**
     * Atualiza uma companhia existente.
     */
    async update(id: string, data: UpdateEnergyCompanyInput): Promise<EnergyCompanyResponse> {
        return prisma.energyCompany.update({
            where: { id },
            data,
        });
    }

    /**
     * Deleta uma companhia.
     */
    async delete(id: string): Promise<EnergyCompanyResponse> {
        return prisma.energyCompany.delete({
            where: { id },
        });
    }

    /**
     * Conta quantas plantas estão vinculadas a uma companhia.
     * Útil para validar se uma companhia pode ser deletada.
     */
    async countLinkedPlants(id: string): Promise<number> {
        return prisma.plant.count({
            where: { energyCompanyId: id },
        });
    }
}

export const energyCompanyRepository = new EnergyCompanyRepository();