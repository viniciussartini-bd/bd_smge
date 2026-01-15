import { z } from 'zod';

/**
 * Enum para as bandeiras tarifárias do sistema elétrico brasileiro.
 * 
 * O sistema de bandeiras tarifárias foi criado pela ANEEL para sinalizar
 * aos consumidores as condições de geração de energia elétrica. Cada cor
 * representa um custo adicional na tarifa devido a fatores como escassez
 * de chuvas e necessidade de acionar termelétricas.
 */
export enum TariffFlag {
    GREEN = 'green',       // Condições favoráveis de geração - sem acréscimo
    YELLOW = 'yellow',     // Condições menos favoráveis - acréscimo moderado
    RED_1 = 'red1',        // Condições mais custosas - acréscimo alto
    RED_2 = 'red2',        // Condições críticas - acréscimo muito alto
}

/**
 * Schema de validação para criação de companhia de energia.
 * 
 * Este schema valida todas as informações necessárias para cadastrar uma
 * distribuidora de energia elétrica no sistema, incluindo dados cadastrais,
 * tarifas e configurações de horário de ponta.
 */
export const createEnergyCompanySchema = z.object({
    /**
     * Nome da companhia distribuidora.
     * Exemplos: "CEMIG", "CPFL", "Light", "Enel"
     */
    name: z.string()
        .min(2, 'Company name must be at least 2 characters long')
        .max(100, 'Company name must not exceed 100 characters')
        .trim(),

    /**
     * CNPJ da companhia (apenas números).
     * Validação completa do dígito verificador do CNPJ.
     */
    cnpj: z.string()
        .transform(val => val.replace(/[^\d]/g, ''))
        .refine(
            (cnpj) => {
                if (cnpj.length !== 14) return false;
                if (/^(\d)\1+$/.test(cnpj)) return false;

                // Validação do primeiro dígito verificador
                let sum = 0;
                let pos = 5;
                for (let i = 0; i < 12; i++) {
                    sum += parseInt(cnpj.charAt(i)) * pos;
                    pos = pos === 2 ? 9 : pos - 1;
                }
                let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
                if (parseInt(cnpj.charAt(12)) !== digit) return false;

                // Validação do segundo dígito verificador
                sum = 0;
                pos = 6;
                for (let i = 0; i < 13; i++) {
                    sum += parseInt(cnpj.charAt(i)) * pos;
                    pos = pos === 2 ? 9 : pos - 1;
                }
                digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
                if (parseInt(cnpj.charAt(13)) !== digit) return false;

                return true;
            },
            'Invalid CNPJ format'
        ),

    /**
     * Telefone de contato (opcional).
     * Formato livre para acomodar diferentes padrões.
     */
    phone: z.string()
        .max(20, 'Phone must not exceed 20 characters')
        .trim()
        .optional(),

    /**
     * Email de contato (opcional).
     */
    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim()
        .optional(),

    // ==================== TARIFAS ====================

    /**
     * Tarifa básica por kWh (R$/kWh).
     * Esta é a tarifa padrão aplicada fora do horário de ponta.
     * Valor típico: R$ 0,50 a R$ 1,00 por kWh
     */
    tariffKwh: z.number()
        .positive('Tariff must be a positive value')
        .max(10, 'Tariff value seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Tariff must be a valid number'
        ),

    /**
     * Tarifa de ponta por kWh (R$/kWh) - opcional.
     * 
     * O horário de ponta é o período de maior demanda de energia, geralmente
     * entre 18h e 21h em dias úteis. Neste período, a tarifa costuma ser
     * significativamente mais cara.
     * 
     * Se não fornecido, assume-se que não há diferenciação de horário de ponta.
     */
    tariffPeakKwh: z.number()
        .positive('Peak tariff must be a positive value')
        .max(10, 'Peak tariff value seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Peak tariff must be a valid number'
        )
        .optional(),

    /**
     * Horário de início do período de ponta (formato HH:MM).
     * Exemplo: "18:00"
     */
    peakStartTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (use HH:MM)')
        .optional(),

    /**
     * Horário de fim do período de ponta (formato HH:MM).
     * Exemplo: "21:00"
     */
    peakEndTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (use HH:MM)')
        .optional(),

    // ==================== BANDEIRAS TARIFÁRIAS ====================

    /**
     * Valor adicional da bandeira verde (R$/kWh).
     * Geralmente R$ 0,00 - sem acréscimo
     */
    greenFlagValue: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .default(0),

    /**
     * Valor adicional da bandeira amarela (R$/kWh).
     * Valor típico: R$ 0,01 a R$ 0,05 por kWh
     */
    yellowFlagValue: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .default(0),

    /**
     * Valor adicional da bandeira vermelha patamar 1 (R$/kWh).
     * Valor típico: R$ 0,05 a R$ 0,10 por kWh
     */
    redFlag1Value: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .default(0),

    /**
     * Valor adicional da bandeira vermelha patamar 2 (R$/kWh).
     * Valor típico: R$ 0,10 a R$ 0,20 por kWh
     */
    redFlag2Value: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .default(0),

    /**
     * Bandeira tarifária atual.
     * Define qual bandeira está em vigor no momento.
     */
    currentFlag: z.enum(TariffFlag)
        .default(TariffFlag.GREEN),
}).refine(
    (data) => {
        // Se tem tarifa de ponta, deve ter horários de ponta definidos
        if (data.tariffPeakKwh && (!data.peakStartTime || !data.peakEndTime)) {
            return false;
        }
        return true;
    },
    {
        message: 'If peak tariff is provided, both peak start and end times must be specified',
    }
).refine(
    (data) => {
        // Se tem horários de ponta, deve ter tarifa de ponta
        if ((data.peakStartTime || data.peakEndTime) && !data.tariffPeakKwh) {
            return false;
        }
        return true;
    },
    {
        message: 'If peak times are provided, peak tariff must also be specified',
    }
).refine(
    (data) => {
        // Validar que horário de início é antes do horário de fim
        if (data.peakStartTime && data.peakEndTime) {
            const start = data.peakStartTime.split(':').map(Number);
            const end = data.peakEndTime.split(':').map(Number);
            const startMinutes = start[0] * 60 + start[1];
            const endMinutes = end[0] * 60 + end[1];
            return startMinutes < endMinutes;
        }
        return true;
    },
    {
        message: 'Peak start time must be before peak end time',
    }
);

/**
 * Schema de validação para atualização de companhia de energia.
 * 
 * Permite atualização parcial de campos. O CNPJ não pode ser alterado
 * após a criação para manter integridade referencial.
 */
export const updateEnergyCompanySchema = z.object({
    name: z.string()
        .min(2, 'Company name must be at least 2 characters long')
        .max(100, 'Company name must not exceed 100 characters')
        .trim()
        .optional(),

    phone: z.string()
        .max(20, 'Phone must not exceed 20 characters')
        .trim()
        .optional()
        .nullable(),

    email: z.email('Invalid email format')
        .toLowerCase()
        .trim()
        .optional()
        .nullable(),

    tariffKwh: z.number()
        .positive('Tariff must be a positive value')
        .max(10, 'Tariff value seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Tariff must be a valid number'
        )
        .optional(),

    tariffPeakKwh: z.number()
        .positive('Peak tariff must be a positive value')
        .max(10, 'Peak tariff value seems unrealistic')
        .refine(
            (val) => Number.isFinite(val),
            'Peak tariff must be a valid number'
        )
        .optional()
        .nullable(),

    peakStartTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (use HH:MM)')
        .optional()
        .nullable(),

    peakEndTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (use HH:MM)')
        .optional()
        .nullable(),

    greenFlagValue: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .optional(),

    yellowFlagValue: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .optional(),

    redFlag1Value: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .optional(),

    redFlag2Value: z.number()
        .min(0, 'Flag value cannot be negative')
        .max(1, 'Flag value seems unrealistic')
        .optional(),

    currentFlag: z.enum(TariffFlag)
        .optional(),
});

/**
 * Schema para query parameters de listagem de companhias.
 */
export const listEnergyCompaniesQuerySchema = z.object({
    page: z.coerce.number()
        .int()
        .positive()
        .default(1),

    limit: z.coerce.number()
        .int()
        .positive()
        .max(100, 'Limit cannot exceed 100')
        .default(10),
});

/**
 * Schema de validação para ID de companhia.
 */
export const energyCompanyIdSchema = z.uuid('Invalid energy company ID');

/**
 * Tipos TypeScript inferidos dos schemas.
 */
export type CreateEnergyCompanyInput = z.infer<typeof createEnergyCompanySchema>;
export type UpdateEnergyCompanyInput = z.infer<typeof updateEnergyCompanySchema>;
export type ListEnergyCompaniesQuery = z.infer<typeof listEnergyCompaniesQuerySchema>;