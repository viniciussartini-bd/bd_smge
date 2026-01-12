import { Request, Response, NextFunction } from 'express';
import { plantService } from './plant.service.js';
import { createPlantSchema, updatePlantSchema, plantIdSchema } from './plant.validators.js';

export class PlantController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createPlantSchema.parse(req.body);
            const userId = (req as any).user.id;
            const plant = await plantService.create(validatedData, userId);
            
            res.status(201).json({
                success: true,
                message: 'Plant created successfully',
                data: plant,
            });
        } catch (error) {
            next(error);
        }
    }

    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = plantIdSchema.parse(req.params.id);
            const includeRelations = req.query.include === 'relations';
            const plant = await plantService.findById(id, includeRelations);
            
            res.status(200).json({
                success: true,
                data: plant,
            });
        } catch (error) {
            next(error);
        }
    }

    async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const includeRelations = req.query.include === 'relations';
            
            const result = await plantService.findAll(page, limit, includeRelations);
            
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
            const id = plantIdSchema.parse(req.params.id);
            const validatedData = updatePlantSchema.parse(req.body);
            const plant = await plantService.update(id, validatedData);
            
            res.status(200).json({
                success: true,
                message: 'Plant updated successfully',
                data: plant,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = plantIdSchema.parse(req.params.id);
            await plantService.delete(id);
            
            res.status(200).json({
                success: true,
                message: 'Plant deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const plantController = new PlantController();