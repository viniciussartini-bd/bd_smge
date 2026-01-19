import { z } from 'zod';

/**
 * Função auxiliar para validar CNPJ.
 * 
 * Esta função realiza a validação completa do CNPJ incluindo os dígitos verificadores.
 * O CNPJ é composto por 14 dígitos, sendo os dois últimos dígitos verificadores calculados
 * através de um algoritmo específico definido pela Receita Federal.
 */
function isValidCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    let pos = 5;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned.charAt(i)) * pos;
        pos = pos === 2 ? 9 : pos - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cleaned.charAt(12)) !== digit) return false;
    
    // Validação do segundo dígito verificador
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

/**
 * Função auxiliar para validar CEP.
 */
function isValidZipCode(zipCode: string): boolean {
    const cleaned = zipCode.replace(/[^\d]/g, '');
    return cleaned.length === 8;
}

/**
 * Schema de validação para criação de perfil de usuário.
 * 
 * Este schema valida todos os campos necessários para criar um perfil completo
 * de uma empresa/propriedade no sistema. O perfil complementa os dados básicos
 * do usuário (User) com informações corporativas e de endereço.
 * 
 * Relacionamento: Profile 1:1 User (cada usuário pode ter apenas um perfil)
 */
export const createProfileSchema = z.object({
    /**
     * Nome fantasia da empresa/propriedade.
     * 
     * O nome fantasia é como a empresa é conhecida comercialmente, diferente
     * da razão social que consta no CNPJ.
     * Exemplo: "Fazenda Solar", "Indústria XYZ"
     */
    fantasyName: z.string()
        .min(2, 'Fantasy name must be at least 2 characters long')
        .max(150, 'Fantasy name must not exceed 150 characters')
        .trim(),

    /**
     * CNPJ da empresa (Cadastro Nacional de Pessoa Jurídica).
     * 
     * Formato aceito: com ou sem formatação (pontos, barras, hífen)
     * Validação: dígitos verificadores são calculados e validados
     * Armazenamento: apenas números (formatação removida)
     * 
     * Este campo deve ser único no sistema - não pode haver dois perfis
     * com o mesmo CNPJ.
     */
    cnpj: z.string()
        .transform(val => val.replace(/[^\d]/g, ''))
        .refine(isValidCNPJ, 'Invalid CNPJ format'),

    /**
     * CEP (Código de Endereçamento Postal).
     * 
     * Formato aceito: com ou sem hífen (12345-678 ou 12345678)
     * Validação: deve ter exatamente 8 dígitos
     * Armazenamento: apenas números
     */
    zipCode: z.string()
        .transform(val => val.replace(/[^\d]/g, ''))
        .refine(isValidZipCode, 'Invalid zip code format'),

    /**
     * Endereço completo (rua, número, complemento).
     * Exemplo: "Rua das Flores, 123, Sala 45"
     */
    address: z.string()
        .min(5, 'Address must be at least 5 characters long')
        .max(200, 'Address must not exceed 200 characters')
        .trim(),

    /**
     * Cidade onde a empresa/propriedade está localizada.
     */
    city: z.string()
        .min(2, 'City must be at least 2 characters long')
        .max(100, 'City must not exceed 100 characters')
        .trim(),

    /**
     * Estado (UF) - sigla de 2 letras.
     * Exemplo: "SP", "RJ", "MG"
     * Sempre convertido para maiúsculas automaticamente.
     */
    state: z.string()
        .length(2, 'State must be 2 characters (UF format)')
        .toUpperCase(),

    /**
     * Telefone de contato (opcional).
     * 
     * Formato livre para acomodar diferentes padrões:
     * - Fixo: (11) 1234-5678
     * - Celular: (11) 91234-5678
     * - Internacional: +55 11 91234-5678
     */
    phone: z.string()
        .max(20, 'Phone must not exceed 20 characters')
        .trim()
        .optional(),
});

/**
 * Schema de validação para atualização de perfil.
 * 
 * Todos os campos são opcionais, permitindo atualizações parciais.
 * 
 * IMPORTANTE: O CNPJ NÃO pode ser alterado após a criação do perfil.
 * Esta restrição mantém a integridade dos dados e evita fraudes.
 * Se for necessário trocar o CNPJ, deve-se deletar o perfil e criar um novo.
 */
export const updateProfileSchema = z.object({
    fantasyName: z.string()
        .min(2, 'Fantasy name must be at least 2 characters long')
        .max(150, 'Fantasy name must not exceed 150 characters')
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

    phone: z.string()
        .max(20, 'Phone must not exceed 20 characters')
        .trim()
        .optional()
        .nullable(), // Permite null para remover o telefone
});

/**
 * Tipos TypeScript inferidos dos schemas.
 */
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;