import { alertRepository } from './alert.repository.js';
import { plantRepository } from '../plant/plant.repository.js';
import { areaRepository } from '../area/area.repository.js';
import { deviceRepository } from '../device/device.repository.js';
import {
    CreateAlertInput,
    UpdateAlertInput,
    AlertType,
    AlertSeverity,
} from './alert.validators.js';
import {
    AlertResponse,
    AlertWithRelations,
    ListAlertsResponse,
    AlertStatistics,
} from './alert.types.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-errors.js';

/**
 * Service responsável pela lógica de negócio de alertas.
 * 
 * Este service coordena operações complexas de gerenciamento de alertas,
 * incluindo validações de escopo, permissões de acesso e estatísticas.
 */
export class AlertService {
    /**
     * Cria um novo alerta.
     * 
     * Validações:
     * - O escopo (planta, área ou dispositivo) deve existir
     * - Para threshold alerts, todos os campos de configuração são obrigatórios
     */
    async create(data: CreateAlertInput, userId: string): Promise<AlertResponse> {
        // Validar que o escopo existe
        await this.validateScope(data.plantId, data.areaId, data.deviceId);

        return alertRepository.create(data, userId);
    }

    /**
     * Busca um alerta por ID.
     * 
     * Validação de permissão: usuários só podem ver seus próprios alertas.
     * Admins podem ver todos os alertas.
     */
    async findById(
        id: string,
        userId: string,
        userRole: string,
        includeRelations: boolean = false
    ): Promise<AlertResponse | AlertWithRelations> {
        const alert = includeRelations
            ? await alertRepository.findByIdWithRelations(id)
            : await alertRepository.findById(id);

        if (!alert) {
            throw new NotFoundError('Alert not found');
        }

        // Verificar permissão: apenas o dono do alerta ou admin pode visualizar
        if (alert.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to view this alert');
        }

        return alert;
    }

    /**
     * Lista alertas de um usuário com suporte a filtros e paginação.
     */
    async findByUser(
        userId: string,
        page: number = 1,
        limit: number = 20,
        filters?: {
            unreadOnly?: boolean;
            severity?: AlertSeverity;
            type?: AlertType;
            activeOnly?: boolean;
            plantId?: string;
            areaId?: string;
            deviceId?: string;
        }
    ): Promise<ListAlertsResponse> {
        const skip = (page - 1) * limit;

        const [alerts, total, unreadCount] = await Promise.all([
            alertRepository.findByUser(userId, skip, limit, filters),
            alertRepository.countByUser(userId, filters),
            alertRepository.countUnreadByUser(userId),
        ]);

        return {
            alerts,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            unreadCount,
        };
    }

    /**
     * Atualiza um alerta existente.
     * 
     * Validação de permissão: apenas o dono do alerta ou admin pode atualizar.
     */
    async update(
        id: string,
        data: UpdateAlertInput,
        userId: string,
        userRole: string
    ): Promise<AlertResponse> {
        const alert = await alertRepository.findById(id);

        if (!alert) {
            throw new NotFoundError('Alert not found');
        }

        // Verificar permissão
        if (alert.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to update this alert');
        }

        return alertRepository.update(id, data);
    }

    /**
     * Marca um alerta como lido ou não lido.
     * 
     * Validação de permissão: apenas o dono do alerta pode marcar como lido.
     */
    async markAsRead(
        id: string,
        isRead: boolean,
        userId: string
    ): Promise<AlertResponse> {
        const alert = await alertRepository.findById(id);

        if (!alert) {
            throw new NotFoundError('Alert not found');
        }

        // Verificar permissão: apenas o dono pode marcar como lido
        if (alert.userId !== userId) {
            throw new ForbiddenError('You do not have permission to modify this alert');
        }

        return alertRepository.markAsRead(id, isRead);
    }

    /**
     * Deleta um alerta.
     * 
     * Validação de permissão: apenas o dono do alerta ou admin pode deletar.
     */
    async delete(id: string, userId: string, userRole: string): Promise<void> {
        const alert = await alertRepository.findById(id);

        if (!alert) {
            throw new NotFoundError('Alert not found');
        }

        // Verificar permissão
        if (alert.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to delete this alert');
        }

        await alertRepository.delete(id);
    }

    /**
     * Obtém estatísticas de alertas para o usuário.
     * 
     * Retorna contagens gerais, distribuição por tipo e severidade,
     * e lista de alertas disparados recentemente.
     */
    async getStatistics(userId: string): Promise<AlertStatistics> {
        const [total, unread, byType, bySeverity, recentTriggered] = await Promise.all([
            alertRepository.countByUser(userId),
            alertRepository.countUnreadByUser(userId),
            alertRepository.getStatsByType(userId),
            alertRepository.getStatsBySeverity(userId),
            alertRepository.findRecentTriggered(userId, 5),
        ]);

        return {
            total,
            unread,
            byType: byType.map((item) => ({
                type: item.type as AlertType,
                count: item.count,
            })),
            bySeverity: bySeverity.map((item) => ({
                severity: item.severity as AlertSeverity,
                count: item.count,
            })),
            recentTriggered,
        };
    }

    /**
     * Marca todos os alertas de um usuário como lidos.
     * Útil para função "marcar todas notificações como lidas".
     */
    async markAllAsRead(userId: string): Promise<number> {
        return alertRepository.markAllAsRead(userId);
    }

    /**
     * Registra que um alerta foi disparado.
     * 
     * Esta função é chamada pelo sistema de monitoramento quando detecta
     * que as condições de um alerta foram satisfeitas.
     */
    async recordTriggered(alertId: string, value: number): Promise<AlertResponse> {
        return alertRepository.recordTriggered(alertId, value);
    }

    /**
     * Valida que o escopo especificado (planta, área ou dispositivo) existe.
     * 
     * @private
     */
    private async validateScope(
        plantId?: string,
        areaId?: string,
        deviceId?: string
    ): Promise<void> {
        if (plantId) {
            const plant = await plantRepository.findById(plantId);
            if (!plant) {
                throw new NotFoundError('Plant not found');
            }
        }

        if (areaId) {
            const area = await areaRepository.findById(areaId);
            if (!area) {
                throw new NotFoundError('Area not found');
            }
        }

        if (deviceId) {
            const device = await deviceRepository.findById(deviceId);
            if (!device) {
                throw new NotFoundError('Device not found');
            }
        }
    }
}

export const alertService = new AlertService();