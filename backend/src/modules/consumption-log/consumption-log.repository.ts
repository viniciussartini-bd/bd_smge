import { prisma } from '../../config/database.config.js';
import { CreateConsumptionLogInput, UpdateConsumptionLogInput, ConsumptionSource } from './consumption-log.validators.js';
import { ConsumptionLogResponse, ConsumptionLogWithRelations } from './consumption-log.types.js';

/**
 * Repository responsável por todas as operações de banco de dados relacionadas a logs de consumo.
 * 
 * Este repository possui métodos otimizados para queries temporais, já que logs de consumo
 * tendem a crescer rapidamente e precisam de queries eficientes para análises de períodos.
 */
export class ConsumptionLogRepository {
    /**
     * Cria um novo log de consumo no banco de dados.
     */
    async create(data: CreateConsumptionLogInput): Promise<ConsumptionLogResponse> {
        return prisma.consumptionLog.create({
            data: {
                consumption: data.consumption,
                timestamp: data.timestamp,
                source: data.source,
                deviceId: data.deviceId,
                voltage: data.voltage || null,
                current: data.current || null,
                powerFactor: data.powerFactor || null,
                temperature: data.temperature || null,
                notes: data.notes || null,
            },
        }) as Promise<ConsumptionLogResponse>;
    }

    /**
     * Busca um log de consumo por ID.
     */
    async findById(id: string): Promise<ConsumptionLogResponse | null> {
        return prisma.consumptionLog.findUnique({
            where: { id },
        }) as Promise<ConsumptionLogResponse | null>;
    }

    /**
     * Busca um log de consumo por ID incluindo relacionamentos.
     */
    async findByIdWithRelations(id: string): Promise<ConsumptionLogWithRelations | null> {
        return prisma.consumptionLog.findUnique({
            where: { id },
            include: {
                device: {
                    select: {
                        id: true,
                        name: true,
                        areaId: true,
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
                },
            },
        }) as Promise<ConsumptionLogWithRelations | null>;
    }

    /**
     * Lista logs de consumo com suporte a paginação e filtros complexos.
     * 
     * Suporta filtros por:
     * - Dispositivo específico
     * - Área (todos os dispositivos da área)
     * - Planta (todos os dispositivos da planta)
     * - Período temporal (startDate e endDate)
     * - Fonte de dados
     */
    async findAll(
        skip: number = 0,
        take: number = 50,
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate?: Date,
        endDate?: Date,
        source?: ConsumptionSource
    ): Promise<ConsumptionLogResponse[]> {
        const where: any = {};

        // Filtro por dispositivo específico
        if (deviceId) {
            where.deviceId = deviceId;
        }

        // Filtro por área (todos os dispositivos da área)
        if (areaId) {
            where.device = {
                areaId: areaId,
            };
        }

        // Filtro por planta (todos os dispositivos da planta)
        if (plantId) {
            where.device = {
                area: {
                    plantId: plantId,
                },
            };
        }

        // Filtro temporal
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = startDate;
            }
            if (endDate) {
                where.timestamp.lte = endDate;
            }
        }

        // Filtro por fonte de dados
        if (source) {
            where.source = source;
        }

        return prisma.consumptionLog.findMany({
            where,
            skip,
            take,
            orderBy: { timestamp: 'desc' }, // Mais recentes primeiro
        }) as Promise<ConsumptionLogResponse[]>;
    }

    /**
     * Lista logs com relacionamentos incluídos.
     */
    async findAllWithRelations(
        skip: number = 0,
        take: number = 50,
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate?: Date,
        endDate?: Date,
        source?: ConsumptionSource
    ): Promise<ConsumptionLogWithRelations[]> {
        const where: any = {};

        if (deviceId) {
            where.deviceId = deviceId;
        }

        if (areaId) {
            where.device = {
                areaId: areaId,
            };
        }

        if (plantId) {
            where.device = {
                area: {
                    plantId: plantId,
                },
            };
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = startDate;
            }
            if (endDate) {
                where.timestamp.lte = endDate;
            }
        }

        if (source) {
            where.source = source;
        }

        return prisma.consumptionLog.findMany({
            where,
            skip,
            take,
            orderBy: { timestamp: 'desc' },
            include: {
                device: {
                    select: {
                        id: true,
                        name: true,
                        areaId: true,
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
                },
            },
        }) as Promise<ConsumptionLogWithRelations[]>;
    }

    /**
     * Conta o total de logs com filtros opcionais.
     */
    async count(
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate?: Date,
        endDate?: Date,
        source?: ConsumptionSource
    ): Promise<number> {
        const where: any = {};

        if (deviceId) {
            where.deviceId = deviceId;
        }

        if (areaId) {
            where.device = {
                areaId: areaId,
            };
        }

        if (plantId) {
            where.device = {
                area: {
                    plantId: plantId,
                },
            };
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = startDate;
            }
            if (endDate) {
                where.timestamp.lte = endDate;
            }
        }

        if (source) {
            where.source = source;
        }

        return prisma.consumptionLog.count({ where });
    }

    /**
     * Atualiza um log de consumo existente.
     * Nota: Apenas métricas adicionais e notas podem ser atualizadas.
     */
    async update(id: string, data: UpdateConsumptionLogInput): Promise<ConsumptionLogResponse> {
        return prisma.consumptionLog.update({
            where: { id },
            data,
        }) as Promise<ConsumptionLogResponse>;
    }

    /**
     * Deleta um log de consumo.
     */
    async delete(id: string): Promise<ConsumptionLogResponse> {
        return prisma.consumptionLog.delete({
            where: { id },
        }) as Promise<ConsumptionLogResponse>;
    }

    /**
     * Calcula estatísticas agregadas de consumo para um período.
     * 
     * Retorna: soma total, média, máximo, mínimo e contagem de leituras.
     * Útil para dashboards e relatórios.
     */
    async getConsumptionStats(
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        total: number;
        average: number;
        max: number;
        min: number;
        count: number;
    }> {
        const where: any = {};

        if (deviceId) {
            where.deviceId = deviceId;
        }

        if (areaId) {
            where.device = {
                areaId: areaId,
            };
        }

        if (plantId) {
            where.device = {
                area: {
                    plantId: plantId,
                },
            };
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = startDate;
            }
            if (endDate) {
                where.timestamp.lte = endDate;
            }
        }

        const stats = await prisma.consumptionLog.aggregate({
            where,
            _sum: {
                consumption: true,
            },
            _avg: {
                consumption: true,
            },
            _max: {
                consumption: true,
            },
            _min: {
                consumption: true,
            },
            _count: true,
        });

        return {
            total: stats._sum.consumption || 0,
            average: stats._avg.consumption || 0,
            max: stats._max.consumption || 0,
            min: stats._min.consumption || 0,
            count: stats._count,
        };
    }

    /**
     * Busca o último log de consumo de um dispositivo.
     * Útil para mostrar leituras mais recentes em dashboards.
     */
    async findLatestByDevice(deviceId: string): Promise<ConsumptionLogResponse | null> {
        return prisma.consumptionLog.findFirst({
            where: { deviceId },
            orderBy: { timestamp: 'desc' },
        }) as Promise<ConsumptionLogResponse | null>;
    }

    /**
     * Busca logs agrupados por período (para gráficos e análises).
     * 
     * Esta é uma query mais complexa que agrupa consumos por dia, semana ou mês.
     * Útil para criar gráficos de tendência.
     */
    async getConsumptionByPeriod(
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{ timestamp: Date; consumption: number }[]> {
        // Esta query será implementada usando raw SQL para performance
        // em grandes volumes de dados, se necessário
        const where: any = {};

        if (deviceId) {
            where.deviceId = deviceId;
        }

        if (areaId) {
            where.device = {
                areaId: areaId,
            };
        }

        if (plantId) {
            where.device = {
                area: {
                    plantId: plantId,
                },
            };
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = startDate;
            }
            if (endDate) {
                where.timestamp.lte = endDate;
            }
        }

        // Por enquanto, retornamos os dados brutos
        // No futuro, podemos otimizar com SQL bruto ou views materializadas
        const logs = await prisma.consumptionLog.findMany({
            where,
            select: {
                timestamp: true,
                consumption: true,
            },
            orderBy: { timestamp: 'asc' },
        });

        return logs;
    }

    /**
     * Deleta logs antigos em lote (para manutenção de dados).
     * Útil para políticas de retenção de dados.
     */
    async deleteOlderThan(date: Date): Promise<number> {
        const result = await prisma.consumptionLog.deleteMany({
            where: {
                timestamp: {
                    lt: date,
                },
            },
        });

        return result.count;
    }
}

export const consumptionLogRepository = new ConsumptionLogRepository();