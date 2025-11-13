/**
 * Classe base para todos os erros customizados da aplicação.
 * 
 * Esta classe estende o Error nativo do JavaScript adicionando propriedades
 * específicas que facilitam o tratamento de erros de forma padronizada.
 * Todos os erros personalizados da aplicação devem herdar desta classe.
 * 
 * A propriedade statusCode permite que o middleware de tratamento de erros
 * automaticamente defina o código HTTP correto na resposta. A propriedade
 * isOperational diferencia erros esperados (como validação de dados) de
 * erros inesperados (como falha de conexão com banco de dados).
 */
export class AppError extends Error {
    /**
     * Código de status HTTP apropriado para este erro
     */
    public readonly statusCode: number;

    /**
     * Indica se este é um erro operacional (esperado) ou um erro de programação
     */
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Mantém a stack trace correta para debugging
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Erro lançado quando um recurso solicitado não é encontrado.
 * 
 * Este erro é usado quando o usuário tenta acessar um recurso que não existe,
 * como tentar buscar uma planta com um ID inválido. Resulta em resposta HTTP 404.
 * 
 * @example
 * ```typescript
 * const plant = await prisma.plant.findUnique({ where: { id } });
 * if (!plant) {
 *   throw new NotFoundError('Plant not found');
 * }
 * ```
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, true);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * Erro lançado quando há falha na autenticação.
 * 
 * Este erro é usado quando credenciais são inválidas, token JWT é inválido ou
 * expirado, ou quando qualquer falha de autenticação ocorre. Resulta em resposta
 * HTTP 401 (Unauthorized).
 * 
 * @example
 * ```typescript
 * const user = await authenticateUser(email, password);
 * if (!user) {
 *   throw new UnauthorizedError('Invalid credentials');
 * }
 * ```
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized access') {
        super(message, 401, true);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * Erro lançado quando o usuário não tem permissão para executar uma ação.
 * 
 * Este erro é usado quando um usuário autenticado tenta executar uma ação que
 * seu papel não permite, como um usuário regular tentando deletar uma planta.
 * Resulta em resposta HTTP 403 (Forbidden).
 * 
 * A diferença entre 401 e 403 é importante: 401 significa "você precisa se
 * autenticar", enquanto 403 significa "você está autenticado, mas não tem
 * permissão para isso".
 * 
 * @example
 * ```typescript
 * if (!hasPermission(user.role, Permission.DELETE_PLANT)) {
 *   throw new ForbiddenError('You do not have permission to delete plants');
 * }
 * ```
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden') {
        super(message, 403, true);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * Erro lançado quando há falha na validação de dados de entrada.
 * 
 * Este erro é usado quando os dados fornecidos pelo usuário não atendem aos
 * requisitos de validação, como campos obrigatórios faltando ou formatos
 * inválidos. Resulta em resposta HTTP 400 (Bad Request).
 * 
 * Opcionalmente pode incluir detalhes sobre quais campos falharam na validação,
 * permitindo que o frontend mostre mensagens de erro específicas para cada campo.
 * 
 * @example
 * ```typescript
 * const validation = plantSchema.safeParse(data);
 * if (!validation.success) {
 *   throw new ValidationError('Invalid plant data', validation.error.errors);
 * }
 * ```
 */
export class ValidationError extends AppError {
    public readonly errors?: any[];

    constructor(message: string = 'Validation failed', errors?: any[]) {
        super(message, 400, true);
        this.errors = errors;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Erro lançado quando há tentativa de criar um recurso que já existe.
 * 
 * Este erro é usado quando há violação de constraint de unicidade, como tentar
 * cadastrar uma planta com um CNPJ que já existe no sistema. Resulta em resposta
 * HTTP 409 (Conflict).
 * 
 * @example
 * ```typescript
 * const existing = await prisma.plant.findUnique({ where: { cnpj } });
 * if (existing) {
 *   throw new ConflictError('A plant with this CNPJ already exists');
 * }
 * ```
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, true);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * Erro lançado quando há problemas internos do servidor.
 * 
 * Este erro é usado para problemas inesperados que não são culpa do usuário,
 * como falha de conexão com banco de dados, erros de serviços externos, ou
 * bugs no código. Resulta em resposta HTTP 500 (Internal Server Error).
 * 
 * Diferente dos outros erros, este é marcado como não operacional por padrão,
 * indicando que é um erro que não deveria acontecer em condições normais.
 * 
 * @example
 * ```typescript
 * try {
 *   await externalService.call();
 * } catch (error) {
 *   throw new InternalServerError('External service unavailable');
 * }
 * ```
 */
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', isOperational: boolean = false) {
        super(message, 500, isOperational);
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}