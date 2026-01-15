import { Request, Response, NextFunction } from 'express';
import { energyCompanyService } from './energy-company.service.js';
import {
    createEnergyCompanySchema,
    updateEnergyCompanySchema,
    listEnergyCompaniesQuerySchema,
    energyCompanyIdSchema,
} from './energy-company.validators.js';

/**
 * Controller responsável por gerenciar as requisições HTTP relacionadas a companhias de energia.
 * 
 * Este controller atua como camada de interface entre as requisições HTTP e a lógica
 * de negócio, validando entradas e formatando respostas.
 */
export class EnergyCompanyController {
    /**
     * Cria uma nova companhia de energia.
     * POST /api/energy-companies
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createEnergyCompanySchema.parse(req.body);
            const company = await energyCompanyService.create(validatedData);

            res.status(201).json({
                success: true,
                message: 'Energy company created successfully',
                data: company,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca uma companhia por ID.
     * GET /api/energy-companies/:id
     */
    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = energyCompanyIdSchema.parse(req.params.id);
            const includeRelations = req.query.include === 'relations';
            const company = await energyCompanyService.findById(id, includeRelations);

            res.status(200).json({
                success: true,
                data: company,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lista todas as companhias com suporte a paginação.
     * GET /api/energy-companies
     */
    async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = listEnergyCompaniesQuerySchema.parse(req.query);
            const includeRelations = req.query.include === 'relations';

            const result = await energyCompanyService.findAll(query.page, query.limit, includeRelations);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualiza uma companhia existente.
     * PUT /api/energy-companies/:id
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = energyCompanyIdSchema.parse(req.params.id);
            const validatedData = updateEnergyCompanySchema.parse(req.body);
            const company = await energyCompanyService.update(id, validatedData);

            res.status(200).json({
                success: true,
                message: 'Energy company updated successfully',
                data: company,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deleta uma companhia.
     * DELETE /api/energy-companies/:id
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = energyCompanyIdSchema.parse(req.params.id);
            await energyCompanyService.delete(id);

            res.status(200).json({
                success: true,
                message: 'Energy company deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Calcula o custo de consumo baseado nas tarifas da companhia.
     * GET /api/energy-companies/:id/calculate-cost
     */
    async calculateCost(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = energyCompanyIdSchema.parse(req.params.id);
            const consumption = parseFloat(req.query.consumption as string);
            const peakConsumption = req.query.peakConsumption
                ? parseFloat(req.query.peakConsumption as string)
                : 0;

            if (isNaN(consumption) || consumption < 0) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid consumption value',
                });
                return;
            }

            if (isNaN(peakConsumption) || peakConsumption < 0) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid peak consumption value',
                });
                return;
            }

            const costCalculation = await energyCompanyService.calculateConsumptionCost(
                id,
                consumption,
                peakConsumption
            );

            res.status(200).json({
                success: true,
                data: costCalculation,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verifica se um horário está no período de ponta.
     * GET /api/energy-companies/:id/peak-time
     */
    async checkPeakTime(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = energyCompanyIdSchema.parse(req.params.id);
            const timestamp = req.query.timestamp
                ? new Date(req.query.timestamp as string)
                : new Date();

            const peakTimeInfo = await energyCompanyService.checkPeakTime(id, timestamp);

            res.status(200).json({
                success: true,
                data: peakTimeInfo,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Estima custo mensal baseado em consumo médio diário.
     * GET /api/energy-companies/:id/estimate-monthly
     */
    async estimateMonthlyCost(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = energyCompanyIdSchema.parse(req.params.id);
            const dailyConsumption = parseFloat(req.query.dailyConsumption as string);
            const dailyPeakConsumption = req.query.dailyPeakConsumption
                ? parseFloat(req.query.dailyPeakConsumption as string)
                : 0;

            if (isNaN(dailyConsumption) || dailyConsumption < 0) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid daily consumption value',
                });
                return;
            }

            const estimate = await energyCompanyService.estimateMonthlyCost(
                id,
                dailyConsumption,
                dailyPeakConsumption
            );

            res.status(200).json({
                success: true,
                data: estimate,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const energyCompanyController = new EnergyCompanyController();