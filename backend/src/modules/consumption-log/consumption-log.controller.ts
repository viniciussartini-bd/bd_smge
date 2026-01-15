import { Request, Response, NextFunction } from 'express';
import { consumptionLogService } from './consumption-log.service.js';
import {
    createConsumptionLogSchema,
    updateConsumptionLogSchema,
    listConsumptionLogsQuerySchema,
    consumptionAnalysisQuerySchema,
    consumptionLogIdSchema,
} from './consumption-log.validators.js';

/**
 * Controller responsável por gerenciar as requisições HTTP relacionadas a logs de consumo.
 * 
 * Este controller oferece endpoints para registro de consumo, consultas históricas,
 * análises estatísticas e detecção de anomalias.
 */
export class ConsumptionLogController {
    /**
     * Cria um novo log de consumo.
     * POST /api/consumption-logs
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createConsumptionLogSchema.parse(req.body);
            const log = await consumptionLogService.create(validatedData);

            res.status(201).json({
                success: true,
                message: 'Consumption log created successfully',
                data: log,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca um log de consumo por ID.
     * GET /api/consumption-logs/:id
     */
    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = consumptionLogIdSchema.parse(req.params.id);
            const includeRelations = req.query.include === 'relations';
            const log = await consumptionLogService.findById(id, includeRelations);

            res.status(200).json({
                success: true,
                data: log,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lista logs de consumo com suporte a filtros e paginação.
     * GET /api/consumption-logs
     */
    async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = listConsumptionLogsQuerySchema.parse(req.query);
            const includeRelations = req.query.include === 'relations';

            const result = await consumptionLogService.findAll(
                query.page,
                query.limit,
                query.deviceId,
                query.areaId,
                query.plantId,
                query.startDate,
                query.endDate,
                query.source,
                includeRelations
            );

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualiza um log de consumo existente.
     * PUT /api/consumption-logs/:id
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = consumptionLogIdSchema.parse(req.params.id);
            const validatedData = updateConsumptionLogSchema.parse(req.body);
            const log = await consumptionLogService.update(id, validatedData);

            res.status(200).json({
                success: true,
                message: 'Consumption log updated successfully',
                data: log,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deleta um log de consumo.
     * DELETE /api/consumption-logs/:id
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = consumptionLogIdSchema.parse(req.params.id);
            await consumptionLogService.delete(id);

            res.status(200).json({
                success: true,
                message: 'Consumption log deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtém a leitura mais recente de um dispositivo.
     * GET /api/consumption-logs/device/:deviceId/latest
     */
    async getLatestReading(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const deviceId = consumptionLogIdSchema.parse(req.params.deviceId);
            const log = await consumptionLogService.getLatestReading(deviceId);

            if (!log) {
                res.status(404).json({
                    success: false,
                    message: 'No readings found for this device',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: log,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtém estatísticas de consumo para um período.
     * GET /api/consumption-logs/stats
     */
    async getConsumptionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { deviceId, areaId, plantId, startDate, endDate } = req.query;

            const stats = await consumptionLogService.getConsumptionStats(
                deviceId as string | undefined,
                areaId as string | undefined,
                plantId as string | undefined,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtém análise detalhada de consumo com breakdown temporal.
     * GET /api/consumption-logs/analysis
     */
    async getConsumptionAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = consumptionAnalysisQuerySchema.parse(req.query);

            const analysis = await consumptionLogService.getConsumptionAnalysis(
                query.deviceId,
                query.areaId,
                query.plantId,
                query.startDate,
                query.endDate,
                query.granularity
            );

            res.status(200).json({
                success: true,
                data: analysis,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Compara consumo entre dois períodos.
     * GET /api/consumption-logs/compare
     */
    async compareConsumption(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                deviceId,
                areaId,
                plantId,
                period1Start,
                period1End,
                period2Start,
                period2End,
            } = req.query;

            if (!period1Start || !period1End || !period2Start || !period2End) {
                res.status(400).json({
                    success: false,
                    message: 'All period dates are required (period1Start, period1End, period2Start, period2End)',
                });
                return;
            }

            const comparison = await consumptionLogService.compareConsumption(
                deviceId as string | undefined,
                areaId as string | undefined,
                plantId as string | undefined,
                new Date(period1Start as string),
                new Date(period1End as string),
                new Date(period2Start as string),
                new Date(period2End as string)
            );

            res.status(200).json({
                success: true,
                data: comparison,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Detecta anomalias de consumo.
     * GET /api/consumption-logs/device/:deviceId/anomalies
     */
    async detectAnomalies(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const deviceId = consumptionLogIdSchema.parse(req.params.deviceId);
            const { threshold, startDate, endDate } = req.query;

            const anomalies = await consumptionLogService.detectAnomalies(
                deviceId,
                threshold ? parseFloat(threshold as string) : 2,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            res.status(200).json({
                success: true,
                data: anomalies,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Projeta consumo futuro baseado em histórico.
     * GET /api/consumption-logs/device/:deviceId/projection
     */
    async projectConsumption(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const deviceId = consumptionLogIdSchema.parse(req.params.deviceId);
            const { historicalDays, projectionDays } = req.query;

            const projection = await consumptionLogService.projectConsumption(
                deviceId,
                historicalDays ? parseInt(historicalDays as string) : 30,
                projectionDays ? parseInt(projectionDays as string) : 30
            );

            res.status(200).json({
                success: true,
                data: projection,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const consumptionLogController = new ConsumptionLogController();