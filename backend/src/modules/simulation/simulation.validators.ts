import { z } from 'zod';

/**
 * Enum para os tipos de simulação disponíveis no sistema.
 * 
 * Cada tipo representa uma categoria diferente de análise que pode
 * ser realizada para planejamento energético.
 */
export enum SimulationType {
    CONSUMPTION_PROJECTION = 'consumption_projection',  // Projeção de consumo futuro
    COST_ESTIMATION = 'cost_estimation',                // Estimativa de custos
    SCENARIO_COMPARISON = 'scenario_comparison',        // Comparação entre cenários
    COST_BENEFIT_ANALYSIS = 'cost_benefit_analysis',    // Análise de custo-benefício
    WHAT_IF_ANALYSIS = 'what_if_analysis',              // Análise "E se...?"
}

/**
 * Enum para o escopo da simulação.
 * 
 * Define se a simulação é para uma planta inteira, uma área específica
 * ou um dispositivo individual.
 */
export enum SimulationScope {
    PLANT = 'plant',
    AREA = 'area',
    DEVICE = 'device',
}

/**
 * Schema de validação para criação de simulação.
 * 
 * Este schema define todas as regras para configurar uma nova simulação
 * de consumo e custo. Simulações permitem aos gestores fazer projeções
 * financeiras e planejar o uso de energia de forma estratégica.
 */
export const createSimulationSchema = z.object({
    /**
     * Nome descritivo da simulação.
     * Deve ser claro sobre o que está sendo simulado.
     * Exemplo: "Projeção de Custo - Expansão de Produção 2025"
     */
    name: z.string()
        .min(3, 'Simulation name must be at least 3 characters long')
        .max(150, 'Simulation name must not exceed 150 characters')
        .trim(),

    /**
     * Descrição detalhada da simulação (opcional).
     * Pode incluir premissas, objetivos e contexto da análise.
     * Exemplo: "Simulação considerando aumento de 30% na produção com operação em 2 turnos"
     */
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .trim()
        .optional(),

    /**
     * Tipo da simulação.
     * Define qual tipo de análise está sendo realizada.
     */
    simulationType: z.enum(SimulationType),

    /**
     * Escopo da simulação (plant, area, ou device).
     */
    scope: z.enum(SimulationScope),

    // ==================== PARÂMETROS DE CONSUMO ====================

    /**
     * Consumo estimado em kWh para o período.
     * 
     * Este é o valor que você projeta que será consumido.
     * Pode ser baseado em históricos, expansões planejadas, ou outros fatores.
     */
    estimatedConsumption: z.number()
        .nonnegative('Estimated consumption cannot be negative')
        .max(10000000, 'Estimated consumption seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Estimated consumption must be a valid number'
        ),

    /**
     * Custo estimado em reais (R$) para o período.
     * 
     * Calculado com base no consumo estimado e nas tarifas vigentes.
     * Este valor pode ser fornecido ou será calculado automaticamente.
     */
    estimatedCost: z.number()
        .nonnegative('Estimated cost cannot be negative')
        .max(100000000, 'Estimated cost seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Estimated cost must be a valid number'
        ),

    // ==================== PERÍODO DA SIMULAÇÃO ====================

    /**
     * Data de início do período simulado.
     * Define o início do intervalo que está sendo analisado.
     */
    startDate: z.coerce.date(),

    /**
     * Data de fim do período simulado.
     * Define o término do intervalo que está sendo analisado.
     */
    endDate: z.coerce.date(),

    // ==================== PARÂMETROS ADICIONAIS ====================

    /**
     * Uso médio diário em horas (opcional).
     * 
     * Útil para calcular consumo baseado em tempo de operação.
     * Exemplo: 16 horas/dia para operação em 2 turnos.
     */
    averageDailyUsage: z.number()
        .min(0, 'Average daily usage cannot be negative')
        .max(24, 'Average daily usage cannot exceed 24 hours')
        .optional(),

    /**
     * Tarifa por kWh utilizada no cálculo (R$/kWh).
     * 
     * Geralmente obtida da companhia de energia vinculada,
     * mas pode ser sobrescrita para análises "e se".
     */
    tariffUsed: z.number()
        .positive('Tariff must be a positive value')
        .max(10, 'Tariff value seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Tariff must be a valid number'
        ),

    /**
     * Bandeira tarifária considerada na simulação (opcional).
     * 
     * Exemplo: "yellow" para simular com bandeira amarela.
     * Se não fornecido, usa a bandeira atual da companhia.
     */
    flagUsed: z.string()
        .max(20, 'Flag name must not exceed 20 characters')
        .optional(),

    // ==================== ESCOPO DA SIMULAÇÃO ====================
    // Exatamente um destes deve ser fornecido, correspondente ao scope

    /**
     * ID da planta (obrigatório se scope = PLANT).
     */
    plantId: z.uuid('Plant ID must be a valid UUID')
        .optional(),

    /**
     * ID da área (obrigatório se scope = AREA).
     */
    areaId: z.uuid('Area ID must be a valid UUID')
        .optional(),

    /**
     * ID do dispositivo (obrigatório se scope = DEVICE).
     */
    deviceId: z.uuid('Device ID must be a valid UUID')
        .optional(),
}).refine(
    (data) => {
        // Validar que startDate é anterior a endDate
        return data.startDate < data.endDate;
    },
    {
        message: 'Start date must be before end date',
    }
).refine(
    (data) => {
        // Validar que o scope corresponde ao ID fornecido
        if (data.scope === SimulationScope.PLANT) {
            return data.plantId !== undefined;
        }
        if (data.scope === SimulationScope.AREA) {
            return data.areaId !== undefined;
        }
        if (data.scope === SimulationScope.DEVICE) {
            return data.deviceId !== undefined;
        }
        return false;
    },
    {
        message: 'The provided ID must match the simulation scope',
    }
);

/**
 * Schema de validação para atualização de simulação.
 * 
 * Permite atualização parcial dos campos. Útil para ajustar simulações
 * com base em novos dados ou corrigir parâmetros.
 */
export const updateSimulationSchema = z.object({
    name: z.string()
        .min(3, 'Simulation name must be at least 3 characters long')
        .max(150, 'Simulation name must not exceed 150 characters')
        .trim()
        .optional(),

    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .trim()
        .optional()
        .nullable(),

    simulationType: z.enum(SimulationType)
        .optional(),

    estimatedConsumption: z.number()
        .nonnegative('Estimated consumption cannot be negative')
        .max(10000000, 'Estimated consumption seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Estimated consumption must be a valid number'
        )
        .optional(),

    estimatedCost: z.number()
        .nonnegative('Estimated cost cannot be negative')
        .max(100000000, 'Estimated cost seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Estimated cost must be a valid number'
        )
        .optional(),

    averageDailyUsage: z.number()
        .min(0, 'Average daily usage cannot be negative')
        .max(24, 'Average daily usage cannot exceed 24 hours')
        .optional()
        .nullable(),

    tariffUsed: z.number()
        .positive('Tariff must be a positive value')
        .max(10, 'Tariff value seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Tariff must be a valid number'
        )
        .optional(),

    flagUsed: z.string()
        .max(20, 'Flag name must not exceed 20 characters')
        .optional()
        .nullable(),

    /**
     * Consumo real em kWh (preenchido após o período).
     * Permite comparar projeção vs realidade.
     */
    realConsumption: z.number()
        .nonnegative('Real consumption cannot be negative')
        .max(10000000, 'Real consumption seems unrealistic')
        .optional()
        .nullable(),

    /**
     * Variância entre estimado e real (%).
     * Calculado automaticamente: ((real - estimado) / estimado) * 100
     */
    variance: z.number()
        .optional()
        .nullable(),
});

/**
 * Schema para query parameters de listagem de simulações.
 */
export const listSimulationsQuerySchema = z.object({
    page: z.coerce.number()
        .int()
        .positive()
        .default(1),

    limit: z.coerce.number()
        .int()
        .positive()
        .max(100, 'Limit cannot exceed 100')
        .default(20),

    /**
     * Filtrar por tipo de simulação.
     */
    simulationType: z.enum(SimulationType)
        .optional(),

    /**
     * Filtrar por escopo.
     */
    scope: z.enum(SimulationScope)
        .optional(),

    /**
     * Filtrar por planta específica.
     */
    plantId: z.uuid('Plant ID must be a valid UUID')
        .optional(),

    /**
     * Filtrar por área específica.
     */
    areaId: z.uuid('Area ID must be a valid UUID')
        .optional(),

    /**
     * Filtrar por dispositivo específico.
     */
    deviceId: z.uuid('Device ID must be a valid UUID')
        .optional(),

    /**
     * Filtrar simulações criadas após esta data.
     */
    startDate: z.coerce.date()
        .optional(),

    /**
     * Filtrar simulações criadas antes desta data.
     */
    endDate: z.coerce.date()
        .optional(),
});

/**
 * Schema de validação para ID de simulação.
 */
export const simulationIdSchema = z.uuid('Invalid simulation ID');

/**
 * Schema para calcular simulação automaticamente.
 * Usado no endpoint de cálculo automático baseado em histórico.
 */
export const calculateSimulationSchema = z.object({
    /**
     * Escopo da simulação.
     */
    scope: z.enum(SimulationScope),

    /**
     * ID do escopo (plantId, areaId, ou deviceId).
     */
    scopeId: z.uuid('Scope ID must be a valid UUID'),

    /**
     * Data de início do período a simular.
     */
    startDate: z.coerce.date(),

    /**
     * Data de fim do período a simular.
     */
    endDate: z.coerce.date(),

    /**
     * Percentual de ajuste no consumo base (opcional).
     * Exemplo: 1.2 para simular aumento de 20% no consumo.
     */
    adjustmentFactor: z.number()
        .positive('Adjustment factor must be positive')
        .min(0.1, 'Adjustment factor too low')
        .max(10, 'Adjustment factor too high')
        .default(1),
}).refine(
    (data) => data.startDate < data.endDate,
    {
        message: 'Start date must be before end date',
    }
);

/**
 * Tipos TypeScript inferidos dos schemas.
 */
export type CreateSimulationInput = z.infer<typeof createSimulationSchema>;
export type UpdateSimulationInput = z.infer<typeof updateSimulationSchema>;
export type ListSimulationsQuery = z.infer<typeof listSimulationsQuerySchema>;
export type CalculateSimulationInput = z.infer<typeof calculateSimulationSchema>;