import { ConsumptionSource } from './consumption-log.validators.js';

export interface ConsumptionLogResponse {
    id: string;
    consumption: number;
    timestamp: Date;
    source: ConsumptionSource;
    deviceId: string;
    voltage: number | null;
    current: number | null;
    powerFactor: number | null;
    temperature: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConsumptionLogWithRelations extends ConsumptionLogResponse {
    device: {
        id: string;
        name: string;
        areaId: string;
        area: {
            id: string;
            name: string;
            plantId: string;
            plant: {
                id: string;
                name: string;
            };
        };
    };
}

export interface ConsumptionLogListResponse {
    logs: ConsumptionLogResponse[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ConsumptionAnalysisResult {
    period: {
        start: Date;
        end: Date;
    };
    totalConsumption: number;
    averageConsumption: number;
    peakConsumption: number;
    minConsumption: number;
    dataPoints: number;
    breakdown: {
        timestamp: Date;
        consumption: number;
    }[];
}

export interface ConsumptionStats {
    deviceId?: string;
    areaId?: string;
    plantId?: string;
    totalConsumption: number;
    averageConsumption: number;
    peakConsumption: number;
    minConsumption: number;
    readingsCount: number;
    period: {
        start: Date;
        end: Date;
    };
}