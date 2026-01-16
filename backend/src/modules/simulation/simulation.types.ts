import { SimulationType, SimulationScope } from '../simulation/simulation.validators.js';

/**
 * Resposta padrão da API para operações com simulações.
 */
export interface SimulationResponse {
    id: string;
    name: string;
    description: string | null;
    simulationType: string;
    scope: string;
    estimatedConsumption: number;
    estimatedCost: number;
    startDate: Date;
    endDate: Date;
    averageDailyUsage: number | null;
    tariffUsed: number;
    flagUsed: string | null;
    realConsumption: number | null;
    variance: number | null;
    userId: string;
    plantId: string | null;
    areaId: string | null;
    deviceId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Simulação com relacionamentos incluídos.
 */
export interface SimulationWithRelations extends SimulationResponse {
    user: {
        id: string;
        name: string;
        email: string;
    };
    plant?: {
        id: string;
        name: string;
        cnpj: string;
    } | null;
    area?: {
        id: string;
        name: string;
        plantId: string;
    } | null;
    device?: {
        id: string;
        name: string;
        power: number;
        areaId: string;
    } | null;
}

/**
 * Resposta de listagem paginada de simulações.
 */
export interface ListSimulationsResponse {
    simulations: SimulationResponse[];
    total: number;
    page: number;
    totalPages: number;
}

/**
 * Resultado de cálculo automático de simulação.
 * 
 * Baseado em dados históricos reais de consumo.
 */
export interface AutoCalculatedSimulation {
    name: string;
    description: string;
    simulationType: SimulationType;
    scope: SimulationScope;
    estimatedConsumption: number;
    estimatedCost: number;
    startDate: Date;
    endDate: Date;
    averageDailyUsage: number;
    tariffUsed: number;
    flagUsed: string;
    scopeId: string;
    calculation: {
        periodDays: number;
        historicalDailyAverage: number;
        adjustmentFactor: number;
        baseConsumption: number;
        adjustedConsumption: number;
        baseCost: number;
        flagCost: number;
        totalCost: number;
    };
}

/**
 * Comparação entre múltiplas simulações.
 * Útil para análises "e se" comparativas.
 */
export interface SimulationComparison {
    simulations: SimulationResponse[];
    comparison: {
        lowestCost: {
            simulation: SimulationResponse;
            savingsVsHighest: number;
        };
        highestCost: {
            simulation: SimulationResponse;
        };
        averageCost: number;
        totalConsumptionRange: {
            min: number;
            max: number;
        };
    };
}

/**
 * Estatísticas de simulações para dashboard.
 */
export interface SimulationStatistics {
    total: number;
    byType: {
        type: SimulationType;
        count: number;
    }[];
    byScope: {
        scope: SimulationScope;
        count: number;
    }[];
    recentSimulations: SimulationResponse[];
    totalEstimatedCost: number;
    averageVariance: number | null;
}

/**
 * Análise de acurácia de simulações passadas.
 * Compara estimativas com valores reais.
 */
export interface AccuracyAnalysis {
    totalSimulations: number;
    simulationsWithReal: number;
    averageVariance: number;
    accuracyPercentage: number;
    mostAccurate: SimulationResponse | null;
    leastAccurate: SimulationResponse | null;
    byScope: {
        scope: SimulationScope;
        averageVariance: number;
        count: number;
    }[];
}