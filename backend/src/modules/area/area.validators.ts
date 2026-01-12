import { z } from 'zod';

/**
 * Schema de validação para criação de área.
 * 
 * Este schema define todas as regras de validação para quando um administrador
 * está criando uma nova área dentro de uma planta. A validação acontece antes
 * dos dados chegarem ao service, garantindo que apenas dados válidos sejam
 * processados.
 * 
 * Áreas são divisões físicas ou funcionais dentro de uma planta industrial.
 * Por exemplo, "Setor de Produção", "Área de Embalagem", "Departamento de Manutenção".
 * Cada área agrupa dispositivos relacionados para facilitar o monitoramento e
 * análise de consumo de energia.
 */
export const createAreaSchema = z.object({
    /**
     * Nome descritivo da área.
     * 
     * O nome deve ser claro e identificar univocamente a área dentro da planta.
     * Permitimos nomes curtos mas significativos, e limitamos o tamanho máximo
     * para prevenir nomes excessivamente longos que causariam problemas de display.
     */
    name: z.string()
        .min(2, 'Area name must be at least 2 characters long')
        .max(100, 'Area name must not exceed 100 characters')
        .trim(),

    /**
     * Área total em metros quadrados.
     * 
     * Este campo permite entender a dimensão física do espaço. Usamos um número
     * positivo com decimais para permitir medições precisas. Por exemplo, uma
     * área pode ter 150.75 m².
     * 
     * O valor máximo de 1 milhão de m² é uma proteção contra typos. Se alguém
     * acidentalmente digitar 10000000 ao invés de 1000, o sistema rejeitará.
     */
    totalArea: z.number()
        .positive('Total area must be a positive number')
        .max(1000000, 'Total area cannot exceed 1,000,000 m²')
        .refine(
            (val) => Number.isFinite(val),
            'Total area must be a valid number'
        ),

    /**
     * Descrição opcional da área.
     * 
     * Este campo permite documentação adicional sobre a área, como sua função,
     * características especiais, horários de operação, ou qualquer informação
     * relevante que ajude a contextualizar a área.
     * 
     * Sendo opcional, permite que administradores criem áreas rapidamente quando
     * necessário, e adicionem descrições mais tarde.
     */
    description: z.string()
        .max(500, 'Description must not exceed 500 characters')
        .trim()
        .optional(),

    /**
     * ID da planta à qual esta área pertence.
     * 
     * Este campo estabelece o relacionamento hierárquico fundamental. Toda área
     * deve pertencer a uma planta. O UUID será validado para garantir que é uma
     * string no formato correto antes de tentarmos buscar a planta no banco.
     */
    plantId: z.uuid('Plant ID must be a valid UUID'),
});

/**
 * Schema de validação para atualização de área.
 * 
 * Este schema é similar ao de criação, mas todos os campos são opcionais.
 * Isso permite atualizações parciais onde o administrador pode modificar apenas
 * os campos que deseja alterar, sem precisar reenviar todos os dados da área.
 * 
 * Por exemplo, se o administrador quer apenas atualizar a descrição, ele pode
 * enviar apenas { description: "Nova descrição" } sem precisar reenviar nome,
 * totalArea, etc.
 * 
 * Note que não permitimos atualizar o plantId. Uma área não pode ser "movida"
 * de uma planta para outra - se isso for necessário, deve-se deletar a área
 * e criar uma nova na planta correta. Esta restrição mantém a integridade
 * do histórico de dados e evita complicações com dados dependentes.
 */
export const updateAreaSchema = z.object({
    name: z.string()
        .min(2, 'Area name must be at least 2 characters long')
        .max(100, 'Area name must not exceed 100 characters')
        .trim()
        .optional(),

    totalArea: z.number()
        .positive('Total area must be a positive number')
        .max(1000000, 'Total area cannot exceed 1,000,000 m²')
        .refine(
            (val) => Number.isFinite(val),
            'Total area must be a valid number'
        )
        .optional(),

    description: z.string()
        .max(500, 'Description must not exceed 500 characters')
        .trim()
        .optional()
        .nullable(), // Permite null para poder remover descrição existente
});

/**
 * Schema para query parameters de listagem de áreas.
 * 
 * Este schema valida os parâmetros que podem ser passados na URL quando
 * listamos áreas. Suportamos dois tipos principais de query:
 * 
 * 1. Paginação: page e limit para controlar quantos resultados retornar
 * 2. Filtragem: plantId para listar apenas áreas de uma planta específica
 * 
 * A filtragem por planta é especialmente útil porque permite que a interface
 * mostre apenas as áreas relevantes quando o usuário está visualizando uma
 * planta específica.
 */
export const listAreasQuerySchema = z.object({
    /**
     * Número da página para paginação (começa em 1).
     */
    page: z.coerce.number()
        .int()
        .positive()
        .default(1),

    /**
     * Quantidade de áreas por página.
     * Limitamos a 100 para prevenir requisições muito pesadas.
     */
    limit: z.coerce.number()
        .int()
        .positive()
        .max(100, 'Limit cannot exceed 100')
        .default(10),

    /**
     * ID da planta para filtrar áreas.
     * Quando fornecido, retorna apenas áreas da planta especificada.
     */
    plantId: z.uuid('Plant ID must be a valid UUID')
        .optional(),
});

/**
 * Tipos TypeScript inferidos dos schemas.
 * 
 * Estes tipos são automaticamente gerados a partir dos schemas de validação,
 * garantindo que nossos tipos TypeScript sempre estejam sincronizados com
 * nossas regras de validação. Se mudarmos uma regra no schema, o tipo é
 * automaticamente atualizado.
 */
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type ListAreasQuery = z.infer<typeof listAreasQuerySchema>;