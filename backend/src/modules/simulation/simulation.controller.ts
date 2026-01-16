import { Request, Response, NextFunction } from 'express';
import { simulationService } from './simulation.service.js';
import {
    createSimulationSchema,
    updateSimulationSchema,
    listSimulationsQuerySchema,
    simulationIdSchema,
    calculateSimulationSchema,
} from './simulation.validators.js';

export class SimulationController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createSimulationSchema.parse(req.body);
            const userId = (req as any).user.id;

            const simulation = await simulationService.create(validatedData, userId);

            res.status(201).json({
                success: true,
                message: 'Simulation created successfully',
                data: simulation,
            });
        } catch (error) {
            next(error);
        }
    }

    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = simulationIdSchema.parse(req.params.id);
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;
            const includeRelations = req.query.include === 'relations';

            const simulation = await simulationService.findById(id, userId, userRole, includeRelations);

            res.status(200).json({
                success: true,
                data: simulation,
            });
        } catch (error) {
            next(error);
        }
    }

    async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = listSimulationsQuerySchema.parse(req.query);
            const userId = (req as any).user.id;

            const result = await simulationService.findByUser(userId, query.page, query.limit, {
                simulationType: query.simulationType,
                scope: query.scope,
                plantId: query.plantId,
                areaId: query.areaId,
                deviceId: query.deviceId,
                startDate: query.startDate,
                endDate: query.endDate,
            });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = simulationIdSchema.parse(req.params.id);
            const validatedData = updateSimulationSchema.parse(req.body);
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;

            const simulation = await simulationService.update(id, validatedData, userId, userRole);

            res.status(200).json({
                success: true,
                message: 'Simulation updated successfully',
                data: simulation,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = simulationIdSchema.parse(req.params.id);
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;

            await simulationService.delete(id, userId, userRole);

            res.status(200).json({
                success: true,
                message: 'Simulation deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;

            const statistics = await simulationService.getStatistics(userId);

            res.status(200).json({
                success: true,
                data: statistics,
            });
        } catch (error) {
            next(error);
        }
    }

    async calculateAuto(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = calculateSimulationSchema.parse(req.body);

            const calculation = await simulationService.calculateAutoSimulation(validatedData);

            res.status(200).json({
                success: true,
                message: 'Simulation calculated successfully',
                data: calculation,
            });
        } catch (error) {
            next(error);
        }
    }

    async getAccuracy(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;

            const analysis = await simulationService.getAccuracyAnalysis(userId);

            res.status(200).json({
                success: true,
                data: analysis,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const simulationController = new SimulationController();