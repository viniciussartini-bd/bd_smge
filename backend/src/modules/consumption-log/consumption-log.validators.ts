import { z } from 'zod';

/**
 * Enum para as possíveis fontes de dados de consumo.
 * Cada fonte tem características específicas de confiabilidade e frequência.
 */
export enum ConsumptionSource {
    MANUAL = 'MANUAL',           // Inserido manualmente pelo usuário
    IOT = 'IOT',                 // Dispositivo IoT genérico
    MODBUS = 'MODBUS',           // Protocolo MODBUS TCP/RTU
    ETHERNET_IP = 'ETHERNET_IP', // Protocolo EtherNet/IP
    PROFIBUS = 'PROFIBUS',       // Protocolo Profibus
    MQTT = 'MQTT',               // Protocolo MQTT
    OPC_UA = 'OPC_UA',           // Protocolo OPC-UA
}

/**
 * Schema de validação para criação de log de consumo.
 * 
 * Este schema valida todas as informações necessárias para registrar uma leitura
 * de consumo de energia. Os dados podem vir de entrada manual ou de sistemas
 * automatizados (IoT, protocolos industriais).
 */
export const createConsumptionLogSchema = z.object({
    /**
     * Consumo em kWh (quilowatts-hora).
     * Deve ser um valor não-negativo. Zero é permitido para indicar que o
     * dispositivo estava desligado no momento da leitura.
     */
    consumption: z.number()
        .min(0, 'Consumption cannot be negative')
        .max(1000000, 'Consumption value seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Consumption must be a valid number'
        ),

    /**
     * Timestamp da leitura.
     * Pode ser fornecido pelo cliente ou será gerado automaticamente.
     * Importante: leituras não podem ser do futuro.
     */
    timestamp: z.coerce.date()
        .refine(
            (date) => date <= new Date(),
            'Timestamp cannot be in the future'
        )
        .default(() => new Date()),

    /**
     * Fonte dos dados de consumo.
     * Ajuda a rastrear a origem e confiabilidade da medição.
     */
    source: z.enum(ConsumptionSource)
        .default(ConsumptionSource.MANUAL),

    /**
     * ID do dispositivo que gerou esta leitura.
     * Relacionamento obrigatório com a tabela Device.
     */
    deviceId: z.uuid('Device ID must be a valid UUID'),

    // ==================== MÉTRICAS ADICIONAIS (Opcionais) ====================
    // Estas métricas são úteis para análises mais profundas e diagnósticos

    /**
     * Voltagem no momento da leitura (em Volts).
     * Útil para detectar quedas de tensão ou problemas na rede elétrica.
     */
    voltage: z.number()
        .positive('Voltage must be positive')
        .max(1000000, 'Voltage seems unrealistic')
        .optional(),

    /**
     * Corrente no momento da leitura (em Amperes).
     * Junto com voltagem, permite calcular potência real.
     */
    current: z.number()
        .positive('Current must be positive')
        .max(100000, 'Current seems unrealistic')
        .optional(),

    /**
     * Fator de potência (entre 0 e 1).
     * Indica a eficiência do uso da energia. Valores baixos indicam desperdício.
     * 1.0 = totalmente eficiente, 0.0 = totalmente ineficiente
     */
    powerFactor: z.number()
        .min(0, 'Power factor must be between 0 and 1')
        .max(1, 'Power factor must be between 0 and 1')
        .optional(),

    /**
     * Temperatura do dispositivo (em Celsius).
     * Útil para correlacionar consumo com temperatura de operação.
     */
    temperature: z.number()
        .min(-50, 'Temperature seems unrealistic')
        .max(200, 'Temperature seems unrealistic')
        .optional(),

    /**
     * Notas ou observações sobre esta leitura.
     * Útil para entrada manual quando há algo incomum a registrar.
     */
    notes: z.string()
        .max(500, 'Notes must not exceed 500 characters')
        .trim()
        .optional(),
});

/**
 * Schema para query parameters de listagem de logs.
 * Suporta filtros temporais e por dispositivo/área.
 */
export const listConsumptionLogsQuerySchema = z.object({
    page: z.coerce.number()
        .int()
        .positive()
        .default(1),

    limit: z.coerce.number()
        .int()
        .positive()
        .max(1000, 'Limit cannot exceed 1000 for performance reasons')
        .default(50),

    /**
     * Filtrar por dispositivo específico.
     */
    deviceId: z.uuid('Device ID must be a valid UUID')
        .optional(),

    /**
     * Filtrar por área específica (todos os dispositivos da área).
     */
    areaId: z.uuid('Area ID must be a valid UUID')
        .optional(),

    /**
     * Filtrar por planta específica (todos os dispositivos da planta).
     */
    plantId: z.uuid('Plant ID must be a valid UUID')
        .optional(),

    /**
     * Data/hora de início do período (inclusive).
     * Formato: ISO 8601 ou timestamp Unix
     */
    startDate: z.coerce.date()
        .optional(),

    /**
     * Data/hora de fim do período (inclusive).
     * Formato: ISO 8601 ou timestamp Unix
     */
    endDate: z.coerce.date()
        .optional(),

    /**
     * Filtrar por fonte de dados.
     */
    source: z.enum(ConsumptionSource)
        .optional(),
}).refine(
    (data) => {
        // Se ambas as datas forem fornecidas, startDate deve ser anterior a endDate
        if (data.startDate && data.endDate) {
            return data.startDate <= data.endDate;
        }
        return true;
    },
    {
        message: 'Start date must be before or equal to end date',
    }
);

/**
 * Schema para análise de consumo agregado.
 * Usado para calcular estatísticas de consumo em períodos específicos.
 */
export const consumptionAnalysisQuerySchema = z.object({
    /**
     * ID do dispositivo para análise.
     * Pode ser combinado com areaId ou plantId para análise agregada.
     */
    deviceId: z.uuid('Device ID must be a valid UUID')
        .optional(),

    /**
     * ID da área para análise agregada.
     */
    areaId: z.uuid('Area ID must be a valid UUID')
        .optional(),

    /**
     * ID da planta para análise agregada.
     */
    plantId: z.uuid('Plant ID must be a valid UUID')
        .optional(),

    /**
     * Data/hora de início do período de análise.
     */
    startDate: z.coerce.date(),

    /**
     * Data/hora de fim do período de análise.
     */
    endDate: z.coerce.date(),

    /**
     * Granularidade da agregação: hourly, daily, weekly, monthly
     */
    granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly'])
        .default('daily'),
}).refine(
    (data) => data.startDate <= data.endDate,
    {
        message: 'Start date must be before or equal to end date',
    }
).refine(
    (data) => {
        // Pelo menos um ID deve ser fornecido
        return data.deviceId || data.areaId || data.plantId;
    },
    {
        message: 'At least one of deviceId, areaId, or plantId must be provided',
    }
);

/**
 * Schema de validação para atualização de log de consumo.
 * Permite atualização apenas de notas e métricas adicionais.
 * Consumo e timestamp não podem ser alterados para manter integridade histórica.
 */
export const updateConsumptionLogSchema = z.object({
    voltage: z.number()
        .positive('Voltage must be positive')
        .max(1000000, 'Voltage seems unrealistic')
        .optional()
        .nullable(),

    current: z.number()
        .positive('Current must be positive')
        .max(100000, 'Current seems unrealistic')
        .optional()
        .nullable(),

    powerFactor: z.number()
        .min(0, 'Power factor must be between 0 and 1')
        .max(1, 'Power factor must be between 0 and 1')
        .optional()
        .nullable(),

    temperature: z.number()
        .min(-50, 'Temperature seems unrealistic')
        .max(200, 'Temperature seems unrealistic')
        .optional()
        .nullable(),

    notes: z.string()
        .max(500, 'Notes must not exceed 500 characters')
        .trim()
        .optional()
        .nullable(),
});

/**
 * Schema de validação para ID de log de consumo.
 */
export const consumptionLogIdSchema = z.uuid('Invalid consumption log ID');

/**
 * Tipos TypeScript inferidos dos schemas.
 */
export type CreateConsumptionLogInput = z.infer<typeof createConsumptionLogSchema>;
export type UpdateConsumptionLogInput = z.infer<typeof updateConsumptionLogSchema>;
export type ListConsumptionLogsQuery = z.infer<typeof listConsumptionLogsQuerySchema>;
export type ConsumptionAnalysisQuery = z.infer<typeof consumptionAnalysisQuerySchema>;