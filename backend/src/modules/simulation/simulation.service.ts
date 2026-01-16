import { simulationRepository } from './simulation.repository.js';
import { plantRepository } from '../plant/plant.repository.js';
import { areaRepository } from '../area/area.repository.js';
import { deviceRepository } from '../device/device.repository.js';
import { energyCompanyRepository } from '../energy-company/energy-company.repository.js';
import { consumptionLogRepository } from '../consumption-log/consumption-log.repository.js';
import { CreateSimulationInput, UpdateSimulationInput, SimulationType, SimulationScope, CalculateSimulationInput } from './simulation.validators.js';
import { SimulationResponse, SimulationWithRelations, ListSimulationsResponse, SimulationStatistics, AutoCalculatedSimulation, AccuracyAnalysis } from './simulation.types.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-errors.js';

export class SimulationService {
    async create(data: CreateSimulationInput, userId: string): Promise<SimulationResponse> {
        await this.validateScope(data.scope, data.plantId, data.areaId, data.deviceId);
        return simulationRepository.create(data, userId);
    }

    async findById(id: string, userId: string, userRole: string, includeRelations: boolean = false): Promise<SimulationResponse | SimulationWithRelations> {
        const simulation = includeRelations
            ? await simulationRepository.findByIdWithRelations(id)
            : await simulationRepository.findById(id);

        if (!simulation) throw new NotFoundError('Simulation not found');
        if (simulation.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to view this simulation');
        }

        return simulation;
    }

    async findByUser(userId: string, page: number = 1, limit: number = 20, filters?: any): Promise<ListSimulationsResponse> {
        const skip = (page - 1) * limit;
        const [simulations, total] = await Promise.all([
            simulationRepository.findByUser(userId, skip, limit, filters),
            simulationRepository.countByUser(userId, filters),
        ]);

        return { simulations, total, page, totalPages: Math.ceil(total / limit) };
    }

    async update(id: string, data: UpdateSimulationInput, userId: string, userRole: string): Promise<SimulationResponse> {
        const simulation = await simulationRepository.findById(id);
        if (!simulation) throw new NotFoundError('Simulation not found');
        if (simulation.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to update this simulation');
        }

        return simulationRepository.update(id, data);
    }

    async delete(id: string, userId: string, userRole: string): Promise<void> {
        const simulation = await simulationRepository.findById(id);
        if (!simulation) throw new NotFoundError('Simulation not found');
        if (simulation.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to delete this simulation');
        }

        await simulationRepository.delete(id);
    }

    async getStatistics(userId: string): Promise<SimulationStatistics> {
        const [total, byType, byScope, recentSimulations, totalEstimatedCost, averageVariance] = await Promise.all([
            simulationRepository.countByUser(userId),
            simulationRepository.getStatsByType(userId),
            simulationRepository.getStatsByScope(userId),
            simulationRepository.findRecent(userId, 5),
            simulationRepository.getTotalEstimatedCost(userId),
            simulationRepository.getAverageVariance(userId),
        ]);

        return {
            total,
            byType: byType.map((item) => ({ type: item.type as SimulationType, count: item.count })),
            byScope: byScope.map((item) => ({ scope: item.scope as SimulationScope, count: item.count })),
            recentSimulations,
            totalEstimatedCost,
            averageVariance,
        };
    }

    async calculateAutoSimulation(data: CalculateSimulationInput): Promise<AutoCalculatedSimulation> {
        await this.validateScope(data.scope, 
            data.scope === SimulationScope.PLANT ? data.scopeId : undefined,
            data.scope === SimulationScope.AREA ? data.scopeId : undefined,
            data.scope === SimulationScope.DEVICE ? data.scopeId : undefined
        );

        const periodDays = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const historicalStart = new Date(data.startDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
        
        const stats = await consumptionLogRepository.getConsumptionStats(
            data.scope === SimulationScope.DEVICE ? data.scopeId : undefined,
            data.scope === SimulationScope.AREA ? data.scopeId : undefined,
            data.scope === SimulationScope.PLANT ? data.scopeId : undefined,
            historicalStart,
            data.startDate
        );

        const historicalDailyAverage = stats.total / periodDays;
        const baseConsumption = historicalDailyAverage * periodDays;
        const adjustedConsumption = baseConsumption * data.adjustmentFactor;

        let tariffUsed = 0.75;
        let flagUsed = 'green';
        let flagValue = 0;

        if (data.scope === SimulationScope.PLANT) {
            const plant = await plantRepository.findById(data.scopeId);
            if (plant?.energyCompanyId) {
                const company = await energyCompanyRepository.findById(plant.energyCompanyId);
                if (company) {
                    tariffUsed = company.tariffKwh;
                    flagUsed = company.currentFlag;
                    flagValue = this.getFlagValue(company.currentFlag, company);
                }
            }
        }

        const baseCost = adjustedConsumption * tariffUsed;
        const flagCost = adjustedConsumption * flagValue;
        const totalCost = baseCost + flagCost;

        return {
            name: `Auto-calculated simulation (${data.scope})`,
            description: `Based on ${periodDays} days of historical data with ${data.adjustmentFactor}x adjustment`,
            simulationType: SimulationType.CONSUMPTION_PROJECTION,
            scope: data.scope,
            estimatedConsumption: adjustedConsumption,
            estimatedCost: totalCost,
            startDate: data.startDate,
            endDate: data.endDate,
            averageDailyUsage: historicalDailyAverage / 24,
            tariffUsed,
            flagUsed,
            scopeId: data.scopeId,
            calculation: {
                periodDays,
                historicalDailyAverage,
                adjustmentFactor: data.adjustmentFactor,
                baseConsumption,
                adjustedConsumption,
                baseCost,
                flagCost,
                totalCost,
            },
        };
    }

    async getAccuracyAnalysis(userId: string): Promise<AccuracyAnalysis> {
        const simulations = await simulationRepository.findWithRealData(userId);
        const total = await simulationRepository.countByUser(userId);

        if (simulations.length === 0) {
            return {
                totalSimulations: total,
                simulationsWithReal: 0,
                averageVariance: 0,
                accuracyPercentage: 0,
                mostAccurate: null,
                leastAccurate: null,
                byScope: [],
            };
        }

        const avgVariance = simulations.reduce((sum, s) => sum + Math.abs(s.variance || 0), 0) / simulations.length;
        const accuracyPercentage = Math.max(0, 100 - avgVariance);

        const sorted = [...simulations].sort((a, b) => Math.abs(a.variance || 0) - Math.abs(b.variance || 0));
        const mostAccurate = sorted[0];
        const leastAccurate = sorted[sorted.length - 1];

        const byScope = ['plant', 'area', 'device'].map((scope) => {
            const scopeSims = simulations.filter((s) => s.scope === scope);
            return {
                scope: scope as SimulationScope,
                averageVariance: scopeSims.length > 0 
                    ? scopeSims.reduce((sum, s) => sum + Math.abs(s.variance || 0), 0) / scopeSims.length 
                    : 0,
                count: scopeSims.length,
            };
        });

        return {
            totalSimulations: total,
            simulationsWithReal: simulations.length,
            averageVariance: avgVariance,
            accuracyPercentage,
            mostAccurate,
            leastAccurate,
            byScope,
        };
    }

    private async validateScope(scope: SimulationScope, plantId?: string, areaId?: string, deviceId?: string): Promise<void> {
        if (scope === SimulationScope.PLANT && plantId) {
            const plant = await plantRepository.findById(plantId);
            if (!plant) throw new NotFoundError('Plant not found');
        }
        if (scope === SimulationScope.AREA && areaId) {
            const area = await areaRepository.findById(areaId);
            if (!area) throw new NotFoundError('Area not found');
        }
        if (scope === SimulationScope.DEVICE && deviceId) {
            const device = await deviceRepository.findById(deviceId);
            if (!device) throw new NotFoundError('Device not found');
        }
    }

    private getFlagValue(flag: string, company: any): number {
        switch (flag) {
            case 'green': return company.greenFlagValue;
            case 'yellow': return company.yellowFlagValue;
            case 'red1': return company.redFlag1Value;
            case 'red2': return company.redFlag2Value;
            default: return 0;
        }
    }
}

export const simulationService = new SimulationService();