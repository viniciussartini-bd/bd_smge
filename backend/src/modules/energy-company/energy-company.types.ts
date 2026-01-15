import { TariffFlag } from './energy-company.validators.js';

/**
 * Resposta padrão da API para operações com companhias de energia.
 */
export interface EnergyCompanyResponse {
    id: string;
    name: string;
    cnpj: string;
    phone: string | null;
    email: string | null;
    tariffKwh: number;
    tariffPeakKwh: number | null;
    peakStartTime: string | null;
    peakEndTime: string | null;
    greenFlagValue: number;
    yellowFlagValue: number;
    redFlag1Value: number;
    redFlag2Value: number;
    currentFlag: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Companhia de energia com relacionamentos incluídos (plantas vinculadas).
 */
export interface EnergyCompanyWithRelations extends EnergyCompanyResponse {
    plants: {
        id: string;
        name: string;
        cnpj: string;
        city: string;
        state: string;
    }[];
}

/**
 * Resposta de listagem paginada de companhias de energia.
 */
export interface ListEnergyCompaniesResponse {
    companies: EnergyCompanyResponse[];
    total: number;
    page: number;
    totalPages: number;
}

/**
 * Cálculo de custo de consumo baseado nas tarifas da companhia.
 */
export interface ConsumptionCostCalculation {
    consumption: number;
    baseCost: number;
    peakCost: number;
    flagCost: number;
    totalCost: number;
    breakdown: {
        regularConsumption: number;
        peakConsumption: number;
        regularCost: number;
        peakCost: number;
        flagCost: number;
    };
    tariffInfo: {
        baseTariff: number;
        peakTariff: number | null;
        currentFlag: TariffFlag;
        flagValue: number;
    };
}

/**
 * Informações sobre horário de ponta.
 */
export interface PeakTimeInfo {
    hasPeakTime: boolean;
    peakStartTime: string | null;
    peakEndTime: string | null;
    isPeakTime: boolean; // Se o momento atual está em horário de ponta
}