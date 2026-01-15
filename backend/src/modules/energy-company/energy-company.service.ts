import { energyCompanyRepository } from './energy-company.repository.js';
import { CreateEnergyCompanyInput, UpdateEnergyCompanyInput, TariffFlag } from './energy-company.validators.js';
import {
    EnergyCompanyResponse,
    EnergyCompanyWithRelations,
    ConsumptionCostCalculation,
    PeakTimeInfo,
} from './energy-company.types.js';
import { NotFoundError, ConflictError } from '../../shared/errors/app-errors.js';

/**
 * Service responsável pela lógica de negócio de companhias de energia.
 * 
 * Este service coordena operações complexas de gestão de distribuidoras,
 * incluindo cálculos de custo baseados em tarifas, bandeiras e horários de ponta.
 */
export class EnergyCompanyService {
    /**
     * Cria uma nova companhia de energia.
     * 
     * Validações:
     * - O CNPJ deve ser único no sistema
     */
    async create(data: CreateEnergyCompanyInput): Promise<EnergyCompanyResponse> {
        const existingCompany = await energyCompanyRepository.findByCNPJ(data.cnpj);

        if (existingCompany) {
            throw new ConflictError('A company with this CNPJ already exists');
        }

        return energyCompanyRepository.create(data);
    }

    /**
     * Busca uma companhia por ID.
     */
    async findById(
        id: string,
        includeRelations: boolean = false
    ): Promise<EnergyCompanyResponse | EnergyCompanyWithRelations> {
        const company = includeRelations
            ? await energyCompanyRepository.findByIdWithRelations(id)
            : await energyCompanyRepository.findById(id);

        if (!company) {
            throw new NotFoundError('Energy company not found');
        }

        return company;
    }

    /**
     * Lista todas as companhias com suporte a paginação.
     */
    async findAll(
        page: number = 1,
        limit: number = 10,
        includeRelations: boolean = false
    ): Promise<{
        companies: EnergyCompanyResponse[] | EnergyCompanyWithRelations[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const [companies, total] = await Promise.all([
            includeRelations
                ? energyCompanyRepository.findAllWithRelations(skip, limit)
                : energyCompanyRepository.findAll(skip, limit),
            energyCompanyRepository.count(),
        ]);

        return {
            companies,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Atualiza uma companhia existente.
     */
    async update(id: string, data: UpdateEnergyCompanyInput): Promise<EnergyCompanyResponse> {
        const company = await energyCompanyRepository.findById(id);

        if (!company) {
            throw new NotFoundError('Energy company not found');
        }

        return energyCompanyRepository.update(id, data);
    }

    /**
     * Deleta uma companhia.
     * 
     * Validação: Não permite deletar se houver plantas vinculadas.
     */
    async delete(id: string): Promise<void> {
        const company = await energyCompanyRepository.findById(id);

        if (!company) {
            throw new NotFoundError('Energy company not found');
        }

        const linkedPlantsCount = await energyCompanyRepository.countLinkedPlants(id);

        if (linkedPlantsCount > 0) {
            throw new ConflictError(
                'Cannot delete energy company with linked plants. Please unlink all plants first.'
            );
        }

        await energyCompanyRepository.delete(id);
    }

    /**
     * Calcula o custo de consumo baseado nas tarifas da companhia.
     * 
     * Este método considera:
     * - Tarifa base por kWh
     * - Tarifa de horário de ponta (se aplicável)
     * - Bandeira tarifária vigente
     * 
     * @param companyId - ID da companhia de energia
     * @param consumption - Consumo em kWh (fora do horário de ponta)
     * @param peakConsumption - Consumo em horário de ponta em kWh (opcional)
     */
    async calculateConsumptionCost(
        companyId: string,
        consumption: number,
        peakConsumption: number = 0
    ): Promise<ConsumptionCostCalculation> {
        const company = await energyCompanyRepository.findById(companyId);

        if (!company) {
            throw new NotFoundError('Energy company not found');
        }

        // Calcular custo base (consumo fora de ponta)
        const baseCost = consumption * company.tariffKwh;

        // Calcular custo de ponta (se aplicável)
        let peakCost = 0;
        if (peakConsumption > 0 && company.tariffPeakKwh) {
            peakCost = peakConsumption * company.tariffPeakKwh;
        }

        // Calcular custo da bandeira tarifária
        const flagValue = this.getCurrentFlagValue(company);
        const totalConsumption = consumption + peakConsumption;
        const flagCost = totalConsumption * flagValue;

        // Custo total
        const totalCost = baseCost + peakCost + flagCost;

        return {
            consumption: totalConsumption,
            baseCost,
            peakCost,
            flagCost,
            totalCost,
            breakdown: {
                regularConsumption: consumption,
                peakConsumption,
                regularCost: baseCost,
                peakCost,
                flagCost,
            },
            tariffInfo: {
                baseTariff: company.tariffKwh,
                peakTariff: company.tariffPeakKwh,
                currentFlag: company.currentFlag as TariffFlag,
                flagValue,
            },
        };
    }

    /**
     * Obtém o valor da bandeira tarifária atual.
     * 
     * @param company - Dados da companhia de energia
     * @returns Valor adicional por kWh da bandeira vigente
     */
    private getCurrentFlagValue(company: EnergyCompanyResponse): number {
        switch (company.currentFlag) {
            case TariffFlag.GREEN:
                return company.greenFlagValue;
            case TariffFlag.YELLOW:
                return company.yellowFlagValue;
            case TariffFlag.RED_1:
                return company.redFlag1Value;
            case TariffFlag.RED_2:
                return company.redFlag2Value;
            default:
                return company.greenFlagValue;
        }
    }

    /**
     * Verifica se um horário específico está dentro do período de ponta.
     * 
     * @param companyId - ID da companhia de energia
     * @param timestamp - Data/hora a verificar (opcional, default: agora)
     * @returns Informações sobre horário de ponta
     */
    async checkPeakTime(companyId: string, timestamp: Date = new Date()): Promise<PeakTimeInfo> {
        const company = await energyCompanyRepository.findById(companyId);

        if (!company) {
            throw new NotFoundError('Energy company not found');
        }

        if (!company.peakStartTime || !company.peakEndTime) {
            return {
                hasPeakTime: false,
                peakStartTime: null,
                peakEndTime: null,
                isPeakTime: false,
            };
        }

        // Converter horários de ponta para minutos
        const [startHour, startMin] = company.peakStartTime.split(':').map(Number);
        const [endHour, endMin] = company.peakEndTime.split(':').map(Number);
        const peakStartMinutes = startHour * 60 + startMin;
        const peakEndMinutes = endHour * 60 + endMin;

        // Converter timestamp atual para minutos
        const currentHour = timestamp.getHours();
        const currentMin = timestamp.getMinutes();
        const currentMinutes = currentHour * 60 + currentMin;

        // Verificar se está no horário de ponta
        const isPeakTime = currentMinutes >= peakStartMinutes && currentMinutes < peakEndMinutes;

        return {
            hasPeakTime: true,
            peakStartTime: company.peakStartTime,
            peakEndTime: company.peakEndTime,
            isPeakTime,
        };
    }

    /**
     * Estima o custo mensal baseado em consumo médio diário.
     * 
     * Útil para projeções e planejamento financeiro.
     * 
     * @param companyId - ID da companhia de energia
     * @param dailyConsumption - Consumo médio diário em kWh
     * @param dailyPeakConsumption - Consumo médio em horário de ponta (opcional)
     */
    async estimateMonthlyCost(
        companyId: string,
        dailyConsumption: number,
        dailyPeakConsumption: number = 0
    ): Promise<{
        dailyCost: number;
        monthlyCost: number;
        annualCost: number;
    }> {
        const dailyCostCalculation = await this.calculateConsumptionCost(
            companyId,
            dailyConsumption,
            dailyPeakConsumption
        );

        const monthlyCost = dailyCostCalculation.totalCost * 30;
        const annualCost = dailyCostCalculation.totalCost * 365;

        return {
            dailyCost: dailyCostCalculation.totalCost,
            monthlyCost,
            annualCost,
        };
    }
}

export const energyCompanyService = new EnergyCompanyService();