import { Request, Response, NextFunction } from 'express';
import { deviceService } from './device.service.js';
import {
    createDeviceSchema,
    updateDeviceSchema,
    listDevicesQuerySchema,
    deviceIdSchema,
} from './device.validators.js';

/**
 * Controller responsável por gerenciar as requisições HTTP relacionadas a dispositivos.
 * 
 * Este controller atua como camada de interface entre as requisições HTTP e a lógica
 * de negócio, validando entradas e formatando respostas.
 */
export class DeviceController {
    /**
     * Cria um novo dispositivo.
     * POST /api/devices
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createDeviceSchema.parse(req.body);
            const device = await deviceService.create(validatedData);

            res.status(201).json({
                success: true,
                message: 'Device created successfully',
                data: device,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca um dispositivo por ID.
     * GET /api/devices/:id
     */
    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = deviceIdSchema.parse(req.params.id);
            const includeRelations = req.query.include === 'relations';
            const device = await deviceService.findById(id, includeRelations);

            res.status(200).json({
                success: true,
                data: device,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lista todos os dispositivos com suporte a paginação e filtros.
     * GET /api/devices
     */
    async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = listDevicesQuerySchema.parse(req.query);
            const includeRelations = req.query.include === 'relations';

            const result = await deviceService.findAll(
                query.page,
                query.limit,
                query.areaId,
                query.plantId,
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
     * Atualiza um dispositivo existente.
     * PUT /api/devices/:id
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = deviceIdSchema.parse(req.params.id);
            const validatedData = updateDeviceSchema.parse(req.body);
            const device = await deviceService.update(id, validatedData);

            res.status(200).json({
                success: true,
                message: 'Device updated successfully',
                data: device,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deleta um dispositivo.
     * DELETE /api/devices/:id
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = deviceIdSchema.parse(req.params.id);
            await deviceService.delete(id);

            res.status(200).json({
                success: true,
                message: 'Device deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualiza o status de conexão de um dispositivo IoT.
     * PATCH /api/devices/:id/connection-status
     */
    async updateConnectionStatus(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const id = deviceIdSchema.parse(req.params.id);
            const { isConnected } = req.body;

            if (typeof isConnected !== 'boolean') {
                res.status(400).json({
                    success: false,
                    message: 'isConnected must be a boolean value',
                });
                return;
            }

            const device = await deviceService.updateConnectionStatus(id, isConnected);

            res.status(200).json({
                success: true,
                message: 'Connection status updated successfully',
                data: device,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Calcula o consumo estimado de um dispositivo.
     * GET /api/devices/:id/estimated-consumption
     */
    async getEstimatedConsumption(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const id = deviceIdSchema.parse(req.params.id);
            const consumption = await deviceService.calculateEstimatedConsumption(id);

            res.status(200).json({
                success: true,
                data: consumption,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const deviceController = new DeviceController();