import { z } from 'zod';

/**
 * Enum para os tipos de alerta disponíveis no sistema.
 * 
 * Cada tipo representa uma categoria diferente de evento que pode
 * gerar uma notificação ao usuário.
 */
export enum AlertType {
    CONSUMPTION_THRESHOLD = 'consumption_threshold',  // Limite de consumo ultrapassado
    CONSUMPTION_ANOMALY = 'consumption_anomaly',      // Comportamento anômalo detectado
    DEVICE_OFFLINE = 'device_offline',                // Dispositivo IoT desconectado
    COST_THRESHOLD = 'cost_threshold',                // Limite de custo ultrapassado
    PEAK_TIME_ALERT = 'peak_time_alert',              // Alerta de horário de ponta
    FLAG_CHANGE = 'flag_change',                      // Mudança de bandeira tarifária
}

/**
 * Enum para os níveis de severidade dos alertas.
 * 
 * A severidade ajuda a priorizar quais alertas demandam atenção imediata
 * e quais são apenas informativos.
 */
export enum AlertSeverity {
    INFO = 'info',         // Informativo - sem ação imediata necessária
    WARNING = 'warning',   // Atenção - situação que merece monitoramento
    CRITICAL = 'critical', // Crítico - requer ação imediata
}

/**
 * Enum para os tipos de comparação de threshold.
 * 
 * Define como o valor medido será comparado com o threshold configurado.
 */
export enum ComparisonType {
    GREATER_THAN = 'greater_than',           // Maior que (>)
    GREATER_THAN_OR_EQUAL = 'greater_equal', // Maior ou igual (>=)
    LESS_THAN = 'less_than',                 // Menor que (<)
    LESS_THAN_OR_EQUAL = 'less_equal',       // Menor ou igual (<=)
    EQUAL = 'equal',                         // Igual (=)
    NOT_EQUAL = 'not_equal',                 // Diferente (!=)
}

/**
 * Enum para janelas temporais de monitoramento.
 * 
 * Define o período sobre o qual o consumo será agregado antes
 * de comparar com o threshold.
 */
export enum TimeWindow {
    HOURLY = 'hourly',   // Análise por hora
    DAILY = 'daily',     // Análise por dia
    WEEKLY = 'weekly',   // Análise por semana
    MONTHLY = 'monthly', // Análise por mês
}

/**
 * Schema de validação para criação de alerta.
 * 
 * Este schema define todas as regras para configurar um novo alerta no sistema.
 * Alertas podem monitorar plantas, áreas ou dispositivos específicos, comparando
 * seus valores de consumo com thresholds configurados.
 */
export const createAlertSchema = z.object({
    /**
     * Título descritivo do alerta.
     * Deve ser conciso mas informativo sobre o que está sendo monitorado.
     * Exemplo: "Consumo Alto - Área de Produção"
     */
    title: z.string()
        .min(3, 'Alert title must be at least 3 characters long')
        .max(100, 'Alert title must not exceed 100 characters')
        .trim(),

    /**
     * Mensagem detalhada explicando o alerta.
     * Pode incluir informações sobre ações recomendadas ou contexto adicional.
     * Exemplo: "O consumo da área de produção ultrapassou 500 kWh. Verifique os equipamentos."
     */
    message: z.string()
        .min(10, 'Alert message must be at least 10 characters long')
        .max(500, 'Alert message must not exceed 500 characters')
        .trim(),

    /**
     * Tipo do alerta (consumo, anomalia, dispositivo offline, etc).
     */
    type: z.enum(AlertType),

    /**
     * Severidade do alerta (info, warning, critical).
     * Define a prioridade de atenção necessária.
     */
    severity: z.enum(AlertSeverity),

    // ==================== CONFIGURAÇÃO DE THRESHOLD ====================

    /**
     * Valor do threshold para comparação.
     * Por exemplo, se o alerta deve disparar quando consumo > 500 kWh,
     * o threshold é 500.
     * 
     * Opcional porque alguns tipos de alerta (como device_offline) não
     * precisam de threshold numérico.
     */
    threshold: z.number()
        .positive('Threshold must be a positive value')
        .optional(),

    /**
     * Tipo de comparação a ser realizada.
     * Define como o valor medido será comparado com o threshold.
     * 
     * Exemplo: GREATER_THAN significa que o alerta dispara quando
     * valor_medido > threshold.
     */
    comparisonType: z.enum(ComparisonType)
        .optional(),

    /**
     * Janela temporal para agregação de dados.
     * 
     * Define o período sobre o qual os valores serão somados antes
     * da comparação com o threshold.
     * 
     * Exemplo: DAILY significa que o consumo será somado por dia
     * e então comparado com o threshold.
     */
    timeWindow: z.enum(TimeWindow)
        .optional(),

    // ==================== ESCOPO DO ALERTA ====================
    // Pelo menos um destes deve ser fornecido para definir o escopo

    /**
     * ID da planta a ser monitorada (opcional).
     * Quando fornecido, o alerta monitora o consumo total da planta.
     */
    plantId: z.uuid('Plant ID must be a valid UUID')
        .optional(),

    /**
     * ID da área a ser monitorada (opcional).
     * Quando fornecido, o alerta monitora o consumo total da área.
     */
    areaId: z.uuid('Area ID must be a valid UUID')
        .optional(),

    /**
     * ID do dispositivo a ser monitorado (opcional).
     * Quando fornecido, o alerta monitora o consumo específico do dispositivo.
     */
    deviceId: z.uuid('Device ID must be a valid UUID')
        .optional(),

    /**
     * Se o alerta está ativo ou não.
     * Alertas inativos não disparam notificações.
     */
    isActive: z.boolean()
        .default(true),
}).refine(
    (data) => {
        // Para alertas de threshold de consumo, os campos threshold,
        // comparisonType e timeWindow são obrigatórios
        if (data.type === AlertType.CONSUMPTION_THRESHOLD || data.type === AlertType.COST_THRESHOLD) {
            return data.threshold !== undefined && 
                    data.comparisonType !== undefined && 
                    data.timeWindow !== undefined;
        }
        return true;
    },
    {
        message: 'Threshold, comparison type, and time window are required for consumption/cost threshold alerts',
    }
).refine(
    (data) => {
        // Pelo menos um escopo (plant, area, ou device) deve ser fornecido
        return data.plantId || data.areaId || data.deviceId;
    },
    {
        message: 'At least one scope (plantId, areaId, or deviceId) must be provided',
    }
);

/**
 * Schema de validação para atualização de alerta.
 * 
 * Permite atualização parcial dos campos. Todos os campos são opcionais,
 * permitindo que o administrador atualize apenas o que deseja modificar.
 */
export const updateAlertSchema = z.object({
    title: z.string()
        .min(3, 'Alert title must be at least 3 characters long')
        .max(100, 'Alert title must not exceed 100 characters')
        .trim()
        .optional(),

    message: z.string()
        .min(10, 'Alert message must be at least 10 characters long')
        .max(500, 'Alert message must not exceed 500 characters')
        .trim()
        .optional(),

    type: z.enum(AlertType)
        .optional(),

    severity: z.enum(AlertSeverity)
        .optional(),

    threshold: z.number()
        .positive('Threshold must be a positive value')
        .optional()
        .nullable(),

    comparisonType: z.enum(ComparisonType)
        .optional()
        .nullable(),

    timeWindow: z.enum(TimeWindow)
        .optional()
        .nullable(),

    isActive: z.boolean()
        .optional(),
});

/**
 * Schema para marcar um alerta como lido.
 * 
 * Quando um usuário visualiza e reconhece um alerta, ele pode
 * marcá-lo como lido para indicar que tomou conhecimento.
 */
export const markAsReadSchema = z.object({
    isRead: z.boolean(),
});

/**
 * Schema para query parameters de listagem de alertas.
 * 
 * Suporta filtros por status de leitura, severidade, tipo e escopo,
 * além de paginação padrão.
 */
export const listAlertsQuerySchema = z.object({
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
     * Filtrar apenas alertas não lidos.
     */
    unreadOnly: z.coerce.boolean()
        .optional(),

    /**
     * Filtrar por severidade específica.
     */
    severity: z.enum(AlertSeverity)
        .optional(),

    /**
     * Filtrar por tipo específico.
     */
    type: z.enum(AlertType)
        .optional(),

    /**
     * Filtrar apenas alertas ativos.
     */
    activeOnly: z.coerce.boolean()
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
});

/**
 * Schema de validação para ID de alerta.
 */
export const alertIdSchema = z.uuid('Invalid alert ID');

/**
 * Tipos TypeScript inferidos dos schemas.
 */
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;