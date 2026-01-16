import { AlertType, AlertSeverity, ComparisonType, TimeWindow } from './alert.validators.js';

/**
 * Resposta padrão da API para operações com alertas.
 */
export interface AlertResponse {
    id: string;
    title: string;
    message: string;
    type: string;
    severity: string;
    isRead: boolean;
    threshold: number | null;
    comparisonType: string | null;
    timeWindow: string | null;
    isActive: boolean;
    triggeredValue: number | null;
    triggeredAt: Date | null;
    userId: string;
    plantId: string | null;
    areaId: string | null;
    deviceId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Alerta com relacionamentos incluídos.
 */
export interface AlertWithRelations extends AlertResponse {
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
        areaId: string;
    } | null;
}

/**
 * Resposta de listagem paginada de alertas.
 */
export interface ListAlertsResponse {
    alerts: AlertResponse[];
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
}

/**
 * Estatísticas de alertas para dashboard.
 */
export interface AlertStatistics {
    total: number;
    unread: number;
    byType: {
        type: AlertType;
        count: number;
    }[];
    bySeverity: {
        severity: AlertSeverity;
        count: number;
    }[];
    recentTriggered: AlertResponse[];
}

/**
 * Resultado da avaliação de um alerta.
 * 
 * Este tipo é usado internamente pelo sistema de monitoramento
 * para determinar se um alerta deve ser disparado.
 */
export interface AlertEvaluationResult {
    shouldTrigger: boolean;
    currentValue: number;
    threshold: number;
    comparisonType: ComparisonType;
    message: string;
}

/**
 * Configuração de um alerta para o sistema de monitoramento.
 */
export interface AlertConfiguration {
    id: string;
    type: AlertType;
    threshold: number | null;
    comparisonType: ComparisonType | null;
    timeWindow: TimeWindow | null;
    scope: {
        plantId: string | null;
        areaId: string | null;
        deviceId: string | null;
    };
    isActive: boolean;
}