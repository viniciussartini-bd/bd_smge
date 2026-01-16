import { Request, Response, NextFunction } from 'express';
import { alertService } from './alert.service.js';
import {
    createAlertSchema,
    updateAlertSchema,
    markAsReadSchema,
    listAlertsQuerySchema,
    alertIdSchema,
} from './alert.validators.js';

/**
 * Controller responsável por gerenciar as requisições HTTP relacionadas a alertas.
 * 
 * Este controller atua como camada de interface entre as requisições HTTP e a lógica
 * de negócio, validando entradas, extraindo informações do usuário autenticado e
 * formatando respostas apropriadas.
 */
export class AlertController {
    /**
     * Cria um novo alerta.
     * POST /api/alerts
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createAlertSchema.parse(req.body);
            const userId = (req as any).user.id;

            const alert = await alertService.create(validatedData, userId);

            res.status(201).json({
                success: true,
                message: 'Alert created successfully',
                data: alert,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca um alerta por ID.
     * GET /api/alerts/:id
     */
    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = alertIdSchema.parse(req.params.id);
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;
            const includeRelations = req.query.include === 'relations';

            const alert = await alertService.findById(id, userId, userRole, includeRelations);

            res.status(200).json({
                success: true,
                data: alert,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lista alertas do usuário com suporte a filtros e paginação.
     * GET /api/alerts
     */
    async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = listAlertsQuerySchema.parse(req.query);
            const userId = (req as any).user.id;

            const result = await alertService.findByUser(userId, query.page, query.limit, {
                unreadOnly: query.unreadOnly,
                severity: query.severity,
                type: query.type,
                activeOnly: query.activeOnly,
                plantId: query.plantId,
                areaId: query.areaId,
                deviceId: query.deviceId,
            });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualiza um alerta existente.
     * PUT /api/alerts/:id
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = alertIdSchema.parse(req.params.id);
            const validatedData = updateAlertSchema.parse(req.body);
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;

            const alert = await alertService.update(id, validatedData, userId, userRole);

            res.status(200).json({
                success: true,
                message: 'Alert updated successfully',
                data: alert,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Marca um alerta como lido ou não lido.
     * PATCH /api/alerts/:id/read
     */
    async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = alertIdSchema.parse(req.params.id);
            const { isRead } = markAsReadSchema.parse(req.body);
            const userId = (req as any).user.id;

            const alert = await alertService.markAsRead(id, isRead, userId);

            res.status(200).json({
                success: true,
                message: isRead ? 'Alert marked as read' : 'Alert marked as unread',
                data: alert,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deleta um alerta.
     * DELETE /api/alerts/:id
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = alertIdSchema.parse(req.params.id);
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;

            await alertService.delete(id, userId, userRole);

            res.status(200).json({
                success: true,
                message: 'Alert deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtém estatísticas de alertas do usuário.
     * GET /api/alerts/statistics
     */
    async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;

            const statistics = await alertService.getStatistics(userId);

            res.status(200).json({
                success: true,
                data: statistics,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Marca todos os alertas do usuário como lidos.
     * POST /api/alerts/mark-all-read
     */
    async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;

            const count = await alertService.markAllAsRead(userId);

            res.status(200).json({
                success: true,
                message: `${count} alert(s) marked as read`,
                data: { count },
            });
        } catch (error) {
            next(error);
        }
    }
}

export const alertController = new AlertController();