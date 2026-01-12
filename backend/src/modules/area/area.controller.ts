import { Request, Response, NextFunction } from 'express';
import { areaService } from './area.service.js';
import { createAreaSchema, updateAreaSchema, listAreasQuerySchema } from './area.validators.js';

export class AreaController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createAreaSchema.parse(req.body);
            const result = await areaService.create(validatedData);

            res.status(201).json({
                success: true,
                message: 'Area created successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const result = await areaService.findById(id);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = listAreasQuerySchema.parse(req.query);
            const result = await areaService.findMany(query.page, query.limit, query.plantId);

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
            const { id } = req.params;
            const validatedData = updateAreaSchema.parse(req.body);
            const result = await areaService.update(id, validatedData);

            res.status(200).json({
                success: true,
                message: 'Area updated successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            await areaService.delete(id);

            res.status(200).json({
                success: true,
                message: 'Area deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const areaController = new AreaController();