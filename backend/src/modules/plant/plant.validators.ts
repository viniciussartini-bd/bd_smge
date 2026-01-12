import { z } from 'zod';

// Função auxiliar para validar CNPJ
function isValidCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;
    
    let sum = 0;
    let pos = 5;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned.charAt(i)) * pos;
        pos = pos === 2 ? 9 : pos - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cleaned.charAt(12)) !== digit) return false;
    
    sum = 0;
    pos = 6;
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cleaned.charAt(i)) * pos;
        pos = pos === 2 ? 9 : pos - 1;
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cleaned.charAt(13)) !== digit) return false;
    
    return true;
}

// Função auxiliar para validar CEP
function isValidZipCode(zipCode: string): boolean {
    const cleaned = zipCode.replace(/[^\d]/g, '');
    return cleaned.length === 8;
}

export const createPlantSchema = z.object({
    name: z.string()
        .min(3, 'Plant name must be at least 3 characters long')
        .max(100, 'Plant name must not exceed 100 characters')
        .trim(),
    
    cnpj: z.string()
        .transform(val => val.replace(/[^\d]/g, ''))
        .refine(isValidCNPJ, 'Invalid CNPJ format'),
    
    zipCode: z.string()
        .transform(val => val.replace(/[^\d]/g, ''))
        .refine(isValidZipCode, 'Invalid zip code format'),
    
    address: z.string()
        .min(5, 'Address must be at least 5 characters long')
        .max(200, 'Address must not exceed 200 characters')
        .trim(),
    
    city: z.string()
        .min(2, 'City must be at least 2 characters long')
        .max(100, 'City must not exceed 100 characters')
        .trim(),
    
    state: z.string()
        .length(2, 'State must be 2 characters (UF format)')
        .toUpperCase(),
    
    totalArea: z.number()
        .positive('Total area must be a positive number')
        .max(1000000, 'Total area seems unrealistic'),
    
    energyCompanyId: z.uuid('Invalid energy company ID').optional(),
});

export const updatePlantSchema = z.object({
    name: z.string()
        .min(3, 'Plant name must be at least 3 characters long')
        .max(100, 'Plant name must not exceed 100 characters')
        .trim()
        .optional(),
    
    zipCode: z.string()
        .transform(val => val.replace(/[^\d]/g, ''))
        .refine(isValidZipCode, 'Invalid zip code format')
        .optional(),
    
    address: z.string()
        .min(5, 'Address must be at least 5 characters long')
        .max(200, 'Address must not exceed 200 characters')
        .trim()
        .optional(),
    
    city: z.string()
        .min(2, 'City must be at least 2 characters long')
        .max(100, 'City must not exceed 100 characters')
        .trim()
        .optional(),
    
    state: z.string()
        .length(2, 'State must be 2 characters (UF format)')
        .toUpperCase()
        .optional(),
    
    totalArea: z.number()
        .positive('Total area must be a positive number')
        .max(1000000, 'Total area seems unrealistic')
        .optional(),
    
    energyCompanyId: z.uuid('Invalid energy company ID').nullable().optional(),
});

export const plantIdSchema = z.uuid('Invalid plant ID');

export type CreatePlantInput = z.infer<typeof createPlantSchema>;
export type UpdatePlantInput = z.infer<typeof updatePlantSchema>;