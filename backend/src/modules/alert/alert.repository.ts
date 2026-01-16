import { prisma } from '../../config/database.config.js';
import { Alert } from '@prisma/client';
import { CreateAlertInput, UpdateAlertInput, AlertType, AlertSeverity } from './alert.validators.js';
import { AlertResponse, AlertWithRelations } from './alert.types.js';

/**
 * Repository responsável por todas as operações de banco de dados relacionadas a alertas.
 * 
 * Este repository encapsula toda a lógica de acesso a dados de alertas e notificações,
 * permitindo que o service trabalhe com objetos de domínio sem se preocupar com
 * detalhes de persistência.
 */
export class AlertRepository {
    /**
     * Cria um novo alerta no banco de dados.
     */
    async create(data: CreateAlertInput, userId: string): Promise<AlertResponse> {
        return prisma.alert.create({
            data: {
                title: data.title,
                message: data.message,
                type: data.type,
                severity: data.severity,
                threshold: data.threshold || null,
                comparisonType: data.comparisonType || null,
                timeWindow: data.timeWindow || null,
                isActive: data.isActive,
                isRead: false,
                userId,
                plantId: data.plantId || null,
                areaId: data.areaId || null,
                deviceId: data.deviceId || null,
            },
        });
    }

    /**
     * Busca um alerta por ID.
     */
    async findById(id: string): Promise<AlertResponse | null> {
        return prisma.alert.findUnique({
            where: { id },
        });
    }

    /**
     * Busca um alerta por ID incluindo relacionamentos.
     */
    async findByIdWithRelations(id: string): Promise<AlertWithRelations | null> {
        return prisma.alert.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                plant: {
                    select: {
                        id: true,
                        name: true,
                        cnpj: true,
                    },
                },
                area: {
                    select: {
                        id: true,
                        name: true,
                        plantId: true,
                    },
                },
                device: {
                    select: {
                        id: true,
                        name: true,
                        areaId: true,
                    },
                },
            },
        }) as Promise<AlertWithRelations | null>;
    }

    /**
     * Lista alertas de um usuário com suporte a filtros e paginação.
     */
    async findByUser(
        userId: string,
        skip: number = 0,
        take: number = 20,
        filters?: {
            unreadOnly?: boolean;
            severity?: AlertSeverity;
            type?: AlertType;
            activeOnly?: boolean;
            plantId?: string;
            areaId?: string;
            deviceId?: string;
        }
    ): Promise<AlertResponse[]> {
        const where: any = { userId };

        if (filters?.unreadOnly) {
            where.isRead = false;
        }

        if (filters?.severity) {
            where.severity = filters.severity;
        }

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.activeOnly) {
            where.isActive = true;
        }

        if (filters?.plantId) {
            where.plantId = filters.plantId;
        }

        if (filters?.areaId) {
            where.areaId = filters.areaId;
        }

        if (filters?.deviceId) {
            where.deviceId = filters.deviceId;
        }

        return prisma.alert.findMany({
            where,
            skip,
            take,
            orderBy: [
                { triggeredAt: 'desc' }, // Alertas disparados recentemente primeiro
                { createdAt: 'desc' },    // Depois por data de criação
            ],
        });
    }

    /**
     * Conta alertas de um usuário com filtros opcionais.
     */
    async countByUser(
        userId: string,
        filters?: {
            unreadOnly?: boolean;
            severity?: AlertSeverity;
            type?: AlertType;
            activeOnly?: boolean;
            plantId?: string;
            areaId?: string;
            deviceId?: string;
        }
    ): Promise<number> {
        const where: any = { userId };

        if (filters?.unreadOnly) {
            where.isRead = false;
        }

        if (filters?.severity) {
            where.severity = filters.severity;
        }

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.activeOnly) {
            where.isActive = true;
        }

        if (filters?.plantId) {
            where.plantId = filters.plantId;
        }

        if (filters?.areaId) {
            where.areaId = filters.areaId;
        }

        if (filters?.deviceId) {
            where.deviceId = filters.deviceId;
        }

        return prisma.alert.count({ where });
    }

    /**
     * Conta alertas não lidos de um usuário.
     */
    async countUnreadByUser(userId: string): Promise<number> {
        return prisma.alert.count({
            where: {
                userId,
                isRead: false,
            },
        });
    }

    /**
     * Atualiza um alerta existente.
     */
    async update(id: string, data: UpdateAlertInput): Promise<AlertResponse> {
        return prisma.alert.update({
            where: { id },
            data,
        });
    }

    /**
     * Marca um alerta como lido ou não lido.
     */
    async markAsRead(id: string, isRead: boolean): Promise<AlertResponse> {
        return prisma.alert.update({
            where: { id },
            data: { isRead },
        });
    }

    /**
     * Registra que um alerta foi disparado.
     * Atualiza o triggeredValue e triggeredAt.
     */
    async recordTriggered(id: string, value: number): Promise<AlertResponse> {
        return prisma.alert.update({
            where: { id },
            data: {
                triggeredValue: value,
                triggeredAt: new Date(),
            },
        });
    }

    /**
     * Deleta um alerta.
     */
    async delete(id: string): Promise<AlertResponse> {
        return prisma.alert.delete({
            where: { id },
        });
    }

    /**
     * Busca todos os alertas ativos de um usuário.
     * Útil para o sistema de monitoramento avaliar quais alertas precisam ser checados.
     */
    async findActiveAlerts(userId?: string): Promise<Alert[]> {
        const where: any = { isActive: true };

        if (userId) {
            where.userId = userId;
        }

        return prisma.alert.findMany({
            where,
            include: {
                plant: true,
                area: true,
                device: true,
            },
        });
    }

    /**
     * Obtém estatísticas de alertas por tipo.
     */
    async getStatsByType(userId: string): Promise<{ type: string; count: number }[]> {
        const result = await prisma.alert.groupBy({
            by: ['type'],
            where: { userId },
            _count: true,
        });

        return result.map((item) => ({
            type: item.type,
            count: item._count,
        }));
    }

    /**
     * Obtém estatísticas de alertas por severidade.
     */
    async getStatsBySeverity(userId: string): Promise<{ severity: string; count: number }[]> {
        const result = await prisma.alert.groupBy({
            by: ['severity'],
            where: { userId },
            _count: true,
        });

        return result.map((item) => ({
            severity: item.severity,
            count: item._count,
        }));
    }

    /**
     * Busca alertas disparados recentemente.
     */
    async findRecentTriggered(userId: string, limit: number = 10): Promise<AlertResponse[]> {
        return prisma.alert.findMany({
            where: {
                userId,
                triggeredAt: { not: null },
            },
            orderBy: { triggeredAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Marca todos os alertas de um usuário como lidos.
     */
    async markAllAsRead(userId: string): Promise<number> {
        const result = await prisma.alert.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        return result.count;
    }
}

export const alertRepository = new AlertRepository();