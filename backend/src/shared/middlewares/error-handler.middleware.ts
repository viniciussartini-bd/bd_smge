import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors/app-errors.js';
import { env } from '../../config/env.config.js';

/**
 * Interface que define a estrutura padronizada de uma resposta de erro.
 * 
 * Ter uma estrutura consistente para todas as respostas de erro é fundamental
 * porque permite que o frontend saiba exatamente o que esperar e como processar
 * os erros. A interface define campos opcionais para diferentes níveis de
 * detalhamento, onde informações mais sensíveis só são incluídas em ambiente
 * de desenvolvimento.
 */
interface ErrorResponse {
    /**
     * Indica que esta é uma resposta de erro
     */
    success: false;

    /**
     * Mensagem principal do erro, segura para mostrar ao usuário
     */
    message: string;

    /**
     * Código de status HTTP associado ao erro
     */
    statusCode: number;

    /**
     * Array opcional com detalhes adicionais, usado principalmente para erros de validação
     * onde queremos informar exatamente quais campos falharam e por quê
     */
    errors?: any[];

    /**
     * Stack trace do erro, incluído apenas em desenvolvimento para facilitar debugging.
     * Nunca deve ser enviado em produção pois pode revelar detalhes internos do sistema
     */
    stack?: string;

    /**
     * Tipo do erro, útil para o frontend decidir como processar ou exibir o erro
     */
    type?: string;
}

/**
 * Middleware global de tratamento de erros.
 * 
 * Este middleware é a última linha de defesa da aplicação. Ele captura todos os
 * erros que não foram tratados anteriormente e os transforma em respostas HTTP
 * apropriadas. A lógica aqui é cuidadosamente projetada para distinguir entre
 * diferentes tipos de erros e tratá-los de forma apropriada.
 * 
 * Para erros operacionais esperados, como validação de dados ou recursos não
 * encontrados, o middleware formula uma resposta informativa que ajuda o usuário
 * a entender o que deu errado. Para erros de programação inesperados, como falhas
 * de conexão com banco de dados ou bugs no código, o middleware registra detalhes
 * completos para debugging mas retorna apenas uma mensagem genérica ao usuário
 * para não expor detalhes internos do sistema.
 * 
 * O middleware também implementa lógica especial para tipos comuns de erros que
 * vêm de bibliotecas externas, como erros do Prisma e erros de validação do Zod,
 * transformando-os em respostas padronizadas e amigáveis.
 */
export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Se já enviamos uma resposta, não podemos enviar outra
    if (res.headersSent) {
        return next(error);
    }

    console.error('❌ Error caught by global error handler:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString(),
    });

    // Trata erros customizados da aplicação (AppError e suas subclasses)
    if (error instanceof AppError) {
        const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
        statusCode: error.statusCode,
        type: error.constructor.name,
        };

        // Inclui erros de validação detalhados se existirem
        if (error instanceof ValidationError && error.errors) {
        errorResponse.errors = error.errors;
        }

        // Inclui stack trace apenas em desenvolvimento
        if (env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        }

        res.status(error.statusCode).json(errorResponse);
        return;
    }

    // Trata erros de validação do Zod
    if (error instanceof ZodError) {
        const validationErrors = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        }));

        const errorResponse: ErrorResponse = {
        success: false,
        message: 'Validation failed. Please check your input data.',
        statusCode: 400,
        type: 'ValidationError',
        errors: validationErrors,
        };

        if (env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        }

        res.status(400).json(errorResponse);
        return;
    }

    // Trata erros do Prisma
    if (error.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaError = error as any;
        const errorResponse = handlePrismaError(prismaError);

        if (env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        }

        res.status(errorResponse.statusCode).json(errorResponse);
        return;
    }

    // Trata erros de validação do Prisma
    if (error.constructor.name === 'PrismaClientValidationError') {
        const errorResponse: ErrorResponse = {
        success: false,
        message: 'Invalid data provided to database operation',
        statusCode: 400,
        type: 'DatabaseValidationError',
        };

        if (env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        }

        res.status(400).json(errorResponse);
        return;
    }

    // Para erros inesperados/desconhecidos
    const errorResponse: ErrorResponse = {
        success: false,
        message:
        env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred. Please try again later.',
        statusCode: 500,
        type: 'InternalServerError',
    };

    if (env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
}

/**
 * Função auxiliar que transforma erros conhecidos do Prisma em respostas apropriadas.
 * 
 * O Prisma lança diferentes códigos de erro para diferentes situações. Esta função
 * analisa o código do erro e formula uma resposta apropriada e amigável. Por exemplo,
 * quando há violação de constraint de unicidade (como tentar cadastrar um CNPJ que
 * já existe), o Prisma lança um erro com código P2002. Nós capturamos este código
 * específico e retornamos uma mensagem clara explicando que aquele dado já existe.
 * 
 * Esta função encapsula todo o conhecimento sobre códigos de erro do Prisma,
 * mantendo o middleware principal mais limpo e focado no fluxo geral de tratamento
 * de erros. Se o Prisma adicionar novos códigos de erro no futuro, ou se precisarmos
 * tratar códigos existentes de forma diferente, temos um único lugar para fazer
 * essas mudanças.
 * 
 * @param error - Erro do Prisma com código conhecido
 * @returns Resposta de erro formatada apropriadamente
 */
function handlePrismaError(error: any): ErrorResponse {
    const code = error.code;

    switch (code) {
        // Violação de constraint de unicidade
        case 'P2002': {
            const target = (error.meta?.target as string[]) || [];
            const field = target[0] || 'field';

            return {
                success: false,
                message: `A record with this ${field} already exists. Please use a different value.`,
                statusCode: 409,
                type: 'ConflictError',
                errors: [
                    {
                        field,
                        message: `This ${field} is already in use`,
                        code: 'unique_constraint_violation',
                    },
                ],
            };
        }

        // Registro não encontrado
        case 'P2025':
        return {
            success: false,
            message: 'The requested record was not found.',
            statusCode: 404,
            type: 'NotFoundError',
        };

        // Falha em constraint de chave estrangeira
        case 'P2003':
        return {
            success: false,
            message: 'The operation references a record that does not exist.',
            statusCode: 400,
            type: 'ForeignKeyError',
        };

        // Violação de constraint de não nulo
        case 'P2011':
        return {
            success: false,
            message: 'Required field cannot be null.',
            statusCode: 400,
            type: 'ValidationError',
        };

        // Timeout na query
        case 'P2024':
        return {
            success: false,
            message: 'Database operation timed out. Please try again.',
            statusCode: 408,
            type: 'TimeoutError',
        };

        // Para outros erros do Prisma, retorna erro genérico
        default:
        return {
            success: false,
            message: 'A database error occurred. Please try again later.',
            statusCode: 500,
            type: 'DatabaseError',
        };
    }
}

/**
 * Middleware para capturar rotas não encontradas (404).
 * 
 * Este middleware deve ser adicionado após todas as rotas válidas da aplicação.
 * Se a execução chegar até este middleware, significa que nenhuma rota anterior
 * correspondeu ao caminho solicitado, então retornamos um erro 404 apropriado.
 * 
 * É importante ter este middleware porque sem ele, requisições para rotas
 * inexistentes simplesmente não receberiam resposta, ficando penduradas até
 * timeout. Com este middleware, o usuário recebe imediatamente uma resposta
 * clara de que a rota solicitada não existe.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
    const error = new AppError(
        `Route ${req.method} ${req.path} not found`,
        404,
        true
    );

    next(error);
}