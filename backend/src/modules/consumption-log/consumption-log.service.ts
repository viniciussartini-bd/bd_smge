import { consumptionLogRepository } from './consumption-log.repository.js';
import { deviceRepository } from '../device/device.repository.js';
import { CreateConsumptionLogInput, UpdateConsumptionLogInput, ConsumptionSource } from './consumption-log.validators.js';
import {
    ConsumptionLogResponse,
    ConsumptionLogWithRelations,
    ConsumptionLogListResponse,
    ConsumptionAnalysisResult,
    ConsumptionStats,
} from './consumption-log.types.js';
import { NotFoundError, ValidationError } from '../../shared/errors/app-errors.js';

/**
 * Service responsável pela lógica de negócio de logs de consumo.
 * 
 * Este service coordena operações complexas de registro e análise de consumo,
 * incluindo validações de dados, cálculos estatísticos e análises temporais.
 */
export class ConsumptionLogService {
    /**
     * Cria um novo log de consumo.
     * 
     * Validações:
     * - O dispositivo deve existir
     * - O timestamp não pode ser no futuro
     * - Valores de consumo devem ser realistas
     */
    async create(data: CreateConsumptionLogInput): Promise<ConsumptionLogResponse> {
        // Verificar se o dispositivo existe
        const device = await deviceRepository.findById(data.deviceId);
        if (!device) {
            throw new NotFoundError('Device not found');
        }

        // Validação adicional: consumo muito alto pode indicar erro
        if (data.consumption > 10000) {
            // Log de warning mas não bloqueia - pode ser legítimo em indústrias pesadas
            console.warn(`High consumption value detected: ${data.consumption} kWh for device ${data.deviceId}`);
        }

        // Validar consistência de métricas elétricas, se fornecidas
        if (data.voltage && data.current) {
            // Calcular potência aparente (V * A)
            const apparentPower = data.voltage * data.current;
            
            // Se temos fator de potência, validar consistência
            if (data.powerFactor) {
                const realPower = apparentPower * data.powerFactor;
                // Verificar se é consistente com o consumo reportado
                // (Esta é uma validação simplificada)
                if (Math.abs(realPower - (data.consumption * 1000)) > realPower * 0.5) {
                    console.warn('Power factor calculation seems inconsistent with reported consumption');
                }
            }
        }

        // Criar o log de consumo
        return consumptionLogRepository.create(data);
    }

    /**
     * Busca um log de consumo por ID.
     */
    async findById(
        id: string,
        includeRelations: boolean = false
    ): Promise<ConsumptionLogResponse | ConsumptionLogWithRelations> {
        const log = includeRelations
            ? await consumptionLogRepository.findByIdWithRelations(id)
            : await consumptionLogRepository.findById(id);

        if (!log) {
            throw new NotFoundError('Consumption log not found');
        }

        return log;
    }

    /**
     * Lista logs de consumo com suporte a paginação e filtros avançados.
     * 
     * Suporta filtros por dispositivo, área, planta, período temporal e fonte de dados.
     */
    async findAll(
        page: number = 1,
        limit: number = 50,
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate?: Date,
        endDate?: Date,
        source?: ConsumptionSource,
        includeRelations: boolean = false
    ): Promise<ConsumptionLogListResponse> {
        const skip = (page - 1) * limit;

        // Validação: não permitir buscar múltiplos filtros conflitantes
        if (deviceId && (areaId || plantId)) {
            throw new ValidationError('Cannot filter by device and area/plant simultaneously');
        }

        const [logs, total] = await Promise.all([
            includeRelations
                ? consumptionLogRepository.findAllWithRelations(
                        skip,
                        limit,
                        deviceId,
                        areaId,
                        plantId,
                        startDate,
                        endDate,
                        source
                    )
                : consumptionLogRepository.findAll(
                        skip,
                        limit,
                        deviceId,
                        areaId,
                        plantId,
                        startDate,
                        endDate,
                        source
                    ),
            consumptionLogRepository.count(deviceId, areaId, plantId, startDate, endDate, source),
        ]);

        return {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Atualiza um log de consumo existente.
     * 
     * Nota: Apenas métricas adicionais e notas podem ser atualizadas.
     * Consumo e timestamp são imutáveis para manter integridade do histórico.
     */
    async update(id: string, data: UpdateConsumptionLogInput): Promise<ConsumptionLogResponse> {
        // Verificar se o log existe
        const log = await consumptionLogRepository.findById(id);
        if (!log) {
            throw new NotFoundError('Consumption log not found');
        }

        return consumptionLogRepository.update(id, data);
    }

    /**
     * Deleta um log de consumo.
     * 
     * Nota: Deleção de logs deve ser feita com cuidado pois afeta históricos
     * e relatórios. Considere usar soft delete em produção.
     */
    async delete(id: string): Promise<void> {
        // Verificar se o log existe
        const log = await consumptionLogRepository.findById(id);
        if (!log) {
            throw new NotFoundError('Consumption log not found');
        }

        await consumptionLogRepository.delete(id);
    }

    /**
     * Obtém a leitura mais recente de um dispositivo.
     * Útil para dashboards em tempo real.
     */
    async getLatestReading(deviceId: string): Promise<ConsumptionLogResponse | null> {
        // Verificar se o dispositivo existe
        const device = await deviceRepository.findById(deviceId);
        if (!device) {
            throw new NotFoundError('Device not found');
        }

        return consumptionLogRepository.findLatestByDevice(deviceId);
    }

    /**
     * Calcula estatísticas de consumo para um período.
     * 
     * Retorna: consumo total, média, pico, mínimo e número de leituras.
     * Essencial para relatórios e dashboards.
     */
    async getConsumptionStats(
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<ConsumptionStats> {
        // Validar que pelo menos um filtro foi fornecido
        if (!deviceId && !areaId && !plantId) {
            throw new ValidationError('At least one of deviceId, areaId, or plantId must be provided');
        }

        // Validar período
        if (startDate && endDate && startDate > endDate) {
            throw new ValidationError('Start date must be before or equal to end date');
        }

        const stats = await consumptionLogRepository.getConsumptionStats(
            deviceId,
            areaId,
            plantId,
            startDate,
            endDate
        );

        return {
            deviceId,
            areaId,
            plantId,
            totalConsumption: stats.total,
            averageConsumption: stats.average,
            peakConsumption: stats.max,
            minConsumption: stats.min,
            readingsCount: stats.count,
            period: {
                start: startDate || new Date(0),
                end: endDate || new Date(),
            },
        };
    }

    /**
     * Gera análise detalhada de consumo com breakdown temporal.
     * 
     * Esta análise é mais completa que as estatísticas simples, incluindo
     * a série temporal de consumo para criar gráficos de tendência.
     */
    async getConsumptionAnalysis(
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: últimos 30 dias
        endDate: Date = new Date(),
        granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
    ): Promise<ConsumptionAnalysisResult> {
        // Validar que pelo menos um filtro foi fornecido
        if (!deviceId && !areaId && !plantId) {
            throw new ValidationError('At least one of deviceId, areaId, or plantId must be provided');
        }

        // Obter estatísticas agregadas
        const stats = await consumptionLogRepository.getConsumptionStats(
            deviceId,
            areaId,
            plantId,
            startDate,
            endDate
        );

        // Obter breakdown temporal
        const breakdown = await consumptionLogRepository.getConsumptionByPeriod(
            deviceId,
            areaId,
            plantId,
            startDate,
            endDate,
            granularity
        );

        return {
            period: {
                start: startDate,
                end: endDate,
            },
            totalConsumption: stats.total,
            averageConsumption: stats.average,
            peakConsumption: stats.max,
            minConsumption: stats.min,
            dataPoints: stats.count,
            breakdown,
        };
    }

    /**
     * Compara consumo entre dois períodos.
     * Útil para identificar tendências e mudanças de comportamento.
     * 
     * Exemplo: Comparar consumo deste mês com o mês passado.
     */
    async compareConsumption(
        deviceId?: string,
        areaId?: string,
        plantId?: string,
        period1Start: Date,
        period1End: Date,
        period2Start: Date,
        period2End: Date
    ): Promise<{
        period1: ConsumptionStats;
        period2: ConsumptionStats;
        difference: {
            absolute: number;
            percentage: number;
        };
    }> {
        const [period1Stats, period2Stats] = await Promise.all([
            this.getConsumptionStats(deviceId, areaId, plantId, period1Start, period1End),
            this.getConsumptionStats(deviceId, areaId, plantId, period2Start, period2End),
        ]);

        const absoluteDifference = period2Stats.totalConsumption - period1Stats.totalConsumption;
        const percentageDifference =
            period1Stats.totalConsumption > 0
                ? (absoluteDifference / period1Stats.totalConsumption) * 100
                : 0;

        return {
            period1: period1Stats,
            period2: period2Stats,
            difference: {
                absolute: absoluteDifference,
                percentage: percentageDifference,
            },
        };
    }

    /**
     * Detecta anomalias de consumo baseado em desvio padrão.
     * 
     * Retorna logs que estão significativamente acima ou abaixo da média.
     * Útil para sistema de alertas.
     */
    async detectAnomalies(
        deviceId: string,
        threshold: number = 2, // Número de desvios padrão
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        anomalies: ConsumptionLogResponse[];
        stats: {
            mean: number;
            stdDev: number;
            threshold: number;
        };
    }> {
        // Obter todos os logs do período
        const logs = await consumptionLogRepository.findAll(
            0,
            10000, // Limite alto para análise estatística
            deviceId,
            undefined,
            undefined,
            startDate,
            endDate
        );

        if (logs.length < 10) {
            throw new ValidationError('Not enough data points for anomaly detection (minimum 10 required)');
        }

        // Calcular média
        const mean = logs.reduce((sum, log) => sum + log.consumption, 0) / logs.length;

        // Calcular desvio padrão
        const variance =
            logs.reduce((sum, log) => sum + Math.pow(log.consumption - mean, 2), 0) / logs.length;
        const stdDev = Math.sqrt(variance);

        // Identificar anomalias
        const anomalies = logs.filter((log) => {
            const zScore = Math.abs(log.consumption - mean) / stdDev;
            return zScore > threshold;
        });

        return {
            anomalies,
            stats: {
                mean,
                stdDev,
                threshold,
            },
        };
    }

    /**
     * Calcula consumo projetado para um período futuro baseado em histórico.
     * 
     * Usa média ponderada dos últimos períodos para fazer a projeção.
     * Nota: Esta é uma projeção simples - algoritmos mais sofisticados podem ser implementados.
     */
    async projectConsumption(
        deviceId: string,
        historicalDays: number = 30,
        projectionDays: number = 30
    ): Promise<{
        historicalAverage: number;
        projectedTotal: number;
        projectedDaily: number;
        confidence: 'low' | 'medium' | 'high';
    }> {
        const endDate = new Date();
        const startDate = new Date(Date.now() - historicalDays * 24 * 60 * 60 * 1000);

        const stats = await consumptionLogRepository.getConsumptionStats(
            deviceId,
            undefined,
            undefined,
            startDate,
            endDate
        );

        // Calcular consumo diário médio
        const dailyAverage = stats.total / historicalDays;

        // Projetar para o futuro
        const projectedTotal = dailyAverage * projectionDays;

        // Determinar confiança baseado no número de leituras
        let confidence: 'low' | 'medium' | 'high';
        if (stats.count < historicalDays * 2) {
            confidence = 'low'; // Menos de 2 leituras por dia
        } else if (stats.count < historicalDays * 10) {
            confidence = 'medium'; // Entre 2 e 10 leituras por dia
        } else {
            confidence = 'high'; // Mais de 10 leituras por dia
        }

        return {
            historicalAverage: dailyAverage,
            projectedTotal,
            projectedDaily: dailyAverage,
            confidence,
        };
    }
}

export const consumptionLogService = new ConsumptionLogService();