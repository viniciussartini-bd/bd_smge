import { z } from 'zod';

/**
 * Schema de validação para criação de dispositivo.
 * 
 * Este schema define todas as regras de validação para quando um administrador
 * está criando um novo dispositivo dentro de uma área. Dispositivos são equipamentos
 * que consomem energia elétrica e podem ser monitorados manualmente ou via IoT.
 */
export const createDeviceSchema = z.object({
    /**
     * Nome identificador do dispositivo.
     * Deve ser claro e único dentro da área para facilitar identificação.
     */
    name: z.string()
        .min(2, 'Device name must be at least 2 characters long')
        .max(100, 'Device name must not exceed 100 characters')
        .trim(),

    /**
     * Modelo do dispositivo (opcional).
     * Exemplo: "Inverter XYZ-3000", "Motor WEG W22"
     */
    model: z.string()
        .max(100, 'Model must not exceed 100 characters')
        .trim()
        .optional(),

    /**
     * Marca/fabricante do dispositivo (opcional).
     * Exemplo: "ABB", "Siemens", "WEG"
     */
    brand: z.string()
        .max(100, 'Brand must not exceed 100 characters')
        .trim()
        .optional(),

    /**
     * Tensão de trabalho em Volts.
     * Deve ser um valor positivo. Exemplos comuns: 110V, 220V, 380V, 440V
     */
    workingVoltage: z.number()
        .positive('Working voltage must be a positive number')
        .max(1000000, 'Working voltage seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Working voltage must be a valid number'
        ),

    /**
     * Potência em Watts.
     * Valor positivo que indica o consumo nominal do dispositivo.
     * Usado para calcular consumo estimado.
     */
    power: z.number()
        .positive('Power must be a positive number')
        .max(10000000, 'Power seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Power must be a valid number'
        ),

    /**
     * Tempo de uso diário em horas.
     * Padrão: 0 horas (dispositivo desligado ou não configurado)
     * Máximo: 24 horas (funcionamento contínuo)
     * Usado para calcular consumo estimado diário.
     */
    usageTime: z.number()
        .min(0, 'Usage time cannot be negative')
        .max(24, 'Usage time cannot exceed 24 hours per day')
        .default(0),

    /**
     * Descrição opcional do dispositivo.
     * Pode conter informações sobre localização específica, função, etc.
     */
    description: z.string()
        .max(500, 'Description must not exceed 500 characters')
        .trim()
        .optional(),

    /**
     * ID da área à qual este dispositivo pertence.
     * Relacionamento obrigatório - todo dispositivo deve estar em uma área.
     */
    areaId: z.uuid('Area ID must be a valid UUID'),

    // ==================== CAMPOS IoT (Opcionais) ====================

    /**
     * ID único do dispositivo no sistema IoT.
     * Usado para identificar o dispositivo em protocolos industriais.
     */
    iotDeviceId: z.string()
        .max(100, 'IoT Device ID must not exceed 100 characters')
        .trim()
        .optional(),

    /**
     * Protocolo de comunicação industrial.
     * Exemplos: "EtherNET/IP", "MODBUS", "Profibus", "MQTT", "OPC-UA"
     */
    protocol: z.string()
        .max(50, 'Protocol must not exceed 50 characters')
        .trim()
        .optional(),

    /**
     * Endereço IP para comunicação de rede.
     * Validação básica de formato IPv4.
     */
    ipAddress: z.ipv4({ error: 'IP address must be a valid IPv4 address' })
        .optional(),

    /**
     * Porta de comunicação.
     * Deve ser um número válido de porta (1-65535).
     */
    port: z.number()
        .int('Port must be an integer')
        .min(1, 'Port must be at least 1')
        .max(65535, 'Port must not exceed 65535')
        .optional(),

    /**
     * Endpoint ou caminho adicional para comunicação.
     * Exemplo: "/api/v1/devices/readings"
     */
    endpoint: z.string()
        .max(200, 'Endpoint must not exceed 200 characters')
        .trim()
        .optional(),
});

/**
 * Schema de validação para atualização de dispositivo.
 * 
 * Permite atualização parcial de campos. O areaId não pode ser alterado
 * após a criação para manter integridade dos dados históricos.
 */
export const updateDeviceSchema = z.object({
    name: z.string()
        .min(2, 'Device name must be at least 2 characters long')
        .max(100, 'Device name must not exceed 100 characters')
        .trim()
        .optional(),

    model: z.string()
        .max(100, 'Model must not exceed 100 characters')
        .trim()
        .optional()
        .nullable(),

    brand: z.string()
        .max(100, 'Brand must not exceed 100 characters')
        .trim()
        .optional()
        .nullable(),

    workingVoltage: z.number()
        .positive('Working voltage must be a positive number')
        .max(1000000, 'Working voltage seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Working voltage must be a valid number'
        )
        .optional(),

    power: z.number()
        .positive('Power must be a positive number')
        .max(10000000, 'Power seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Power must be a valid number'
        )
        .optional(),

    usageTime: z.number()
        .min(0, 'Usage time cannot be negative')
        .max(24, 'Usage time cannot exceed 24 hours per day')
        .optional(),

    description: z.string()
        .max(500, 'Description must not exceed 500 characters')
        .trim()
        .optional()
        .nullable(),

    iotDeviceId: z.string()
        .max(100, 'IoT Device ID must not exceed 100 characters')
        .trim()
        .optional()
        .nullable(),

    protocol: z.string()
        .max(50, 'Protocol must not exceed 50 characters')
        .trim()
        .optional()
        .nullable(),

    ipAddress: z.ipv4({ error: 'IP address must be a valid IPv4 address' })
        .optional()
        .nullable(),

    port: z.number()
        .int('Port must be an integer')
        .min(1, 'Port must be at least 1')
        .max(65535, 'Port must not exceed 65535')
        .optional()
        .nullable(),

    endpoint: z.string()
        .max(200, 'Endpoint must not exceed 200 characters')
        .trim()
        .optional()
        .nullable(),
});

/**
 * Schema para query parameters de listagem de dispositivos.
 */
export const listDevicesQuerySchema = z.object({
    page: z.coerce.number()
        .int()
        .positive()
        .default(1),

    limit: z.coerce.number()
        .int()
        .positive()
        .max(100, 'Limit cannot exceed 100')
        .default(10),

    areaId: z.uuid('Area ID must be a valid UUID')
        .optional(),

    plantId: z.uuid('Plant ID must be a valid UUID')
        .optional(),
});

/**
 * Schema de validação para ID de dispositivo.
 */
export const deviceIdSchema = z.uuid('Invalid device ID');

/**
 * Tipos TypeScript inferidos dos schemas.
 */
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;