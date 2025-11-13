import { Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/app-errors.js';
import { hasPermission, hasAllPermissions, hasAnyPermission } from '../utils/permissions.utils.js';
import { Permission } from '../types/permissions.types.js';
import { AuthenticatedRequest } from '../types/express.types.js';

/**
 * Factory function que cria um middleware de autorização para uma permissão específica.
 * 
 * Esta função é chamada de factory porque ela não é o middleware em si, mas uma função
 * que cria middlewares. Quando você chama requirePermission(Permission.CREATE_PLANT),
 * ela retorna uma nova função middleware que verifica especificamente se o usuário
 * tem permissão para criar plantas. Este padrão é extremamente útil porque permite
 * que você crie middlewares personalizados de forma declarativa e legível.
 * 
 * O middleware retornado assume que a requisição já passou pelo middleware de
 * autenticação, ou seja, que req.user já está populado com as informações do
 * usuário autenticado. Se este middleware for usado em uma rota que não tem
 * autenticação, ele vai falhar porque req.user será undefined.
 * 
 * @param permission - A permissão específica que será verificada
 * @returns Um middleware do Express que verifica a permissão
 * 
 * @example
 * ```typescript
 * // Protege a rota de criação de plantas
 * router.post('/plants',
 *   authenticate,
 *   requirePermission(Permission.CREATE_PLANT),
 *   plantController.create
 * );
 * ```
 */
export function requirePermission(permission: Permission) {
    return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new ForbiddenError('User authentication required for authorization');
            }

            // Verifica se o usuário tem a permissão necessária
            if (!hasPermission(req.user.role, permission)) {
                throw new ForbiddenError(
                `You do not have permission to perform this action. Required permission: ${permission}`
                );
            }

            // Usuário tem permissão, prossegue para o próximo middleware ou controller
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Factory function que cria um middleware que verifica múltiplas permissões.
 * 
 * Esta função é útil quando uma operação requer várias permissões simultaneamente.
 * Por exemplo, uma operação que tanto visualiza quanto modifica dados precisaria
 * verificar ambas as permissões. O usuário precisa ter TODAS as permissões listadas
 * para que a verificação passe. Se faltar qualquer uma delas, a requisição é rejeitada.
 * 
 * Este middleware é mais restritivo que requireAnyPermission porque exige que o
 * usuário tenha todas as permissões, não apenas uma delas. Use este middleware
 * quando a operação realmente precisa de múltiplas capacidades simultaneamente.
 * 
 * @param permissions - Array de permissões que o usuário deve ter
 * @returns Um middleware do Express que verifica todas as permissões
 * 
 * @example
 * ```typescript
 * // Operação complexa que requer múltiplas permissões
 * router.put('/plants/:id/config',
 *   authenticate,
 *   requireAllPermissions([
 *     Permission.VIEW_PLANT,
 *     Permission.UPDATE_PLANT,
 *     Permission.LINK_IOT_DEVICE
 *   ]),
 *   plantController.updateConfig
 * );
 * ```
 */
export function requireAllPermissions(permissions: Permission[]) {
    return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new ForbiddenError('User authentication required for authorization');
            }

            if (!hasAllPermissions(req.user.role, permissions)) {
                const missingPermissions = permissions.filter(
                (permission) => !hasPermission(req.user.role, permission)
                );

                throw new ForbiddenError(
                `You do not have all required permissions. Missing: ${missingPermissions.join(', ')}`
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Factory function que cria um middleware que aceita qualquer uma das permissões listadas.
 * 
 * Esta função é útil quando múltiplas permissões diferentes podem autorizar a mesma
 * operação. Por exemplo, tanto poder criar quanto poder atualizar plantas poderia
 * permitir acesso a um formulário de edição. O usuário precisa ter PELO MENOS UMA
 * das permissões listadas. Se tiver qualquer uma delas, a verificação passa.
 * 
 * Este middleware é mais flexível que requireAllPermissions porque permite que
 * diferentes tipos de usuários acessem a mesma funcionalidade através de diferentes
 * permissões. É especialmente útil para rotas que podem servir múltiplos propósitos
 * dependendo do contexto.
 * 
 * @param permissions - Array de permissões, onde apenas uma é necessária
 * @returns Um middleware do Express que verifica se o usuário tem pelo menos uma permissão
 * 
 * @example
 * ```typescript
 * // Permite acesso se o usuário pode criar OU atualizar
 * router.get('/plants/form',
 *   authenticate,
 *   requireAnyPermission([
 *     Permission.CREATE_PLANT,
 *     Permission.UPDATE_PLANT
 *   ]),
 *   plantController.showForm
 * );
 * ```
 */
export function requireAnyPermission(permissions: Permission[]) {
    return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw new ForbiddenError('User authentication required for authorization');
            }

            if (!hasAnyPermission(req.user.role, permissions)) {
                throw new ForbiddenError(
                `You do not have any of the required permissions: ${permissions.join(', ')}`
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware que verifica se o usuário é administrador.
 * 
 * Este middleware é um atalho conveniente para verificar se o usuário tem papel
 * de administrador. Embora você pudesse usar requirePermission para cada permissão
 * administrativa individualmente, às vezes é mais claro e direto simplesmente
 * verificar se o usuário é admin. Use este middleware para rotas que são
 * exclusivamente administrativas e não fazem sentido para usuários regulares.
 * 
 * @example
 * ```typescript
 * // Rota exclusiva para administradores
 * router.delete('/users/:id',
 *   authenticate,
 *   requireAdmin,
 *   userController.delete
 * );
 * ```
 */
export async function requireAdmin(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            throw new ForbiddenError('User authentication required for authorization');
        }

        if (req.user.role !== 'ADMIN') {
            throw new ForbiddenError('This action requires administrator privileges');
        }

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Middleware que verifica se o usuário é o dono do recurso ou é administrador.
 * 
 * Este middleware implementa autorização baseada em propriedade do recurso. Ele é
 * útil para recursos que os usuários podem modificar apenas se forem os donos, mas
 * administradores podem modificar independentemente de quem criou. Por exemplo,
 * usuários podem deletar suas próprias simulações, mas administradores podem
 * deletar qualquer simulação.
 * 
 * Este middleware requer que você forneça uma função que extrai o ID do dono do
 * recurso. Esta função recebe o request e deve retornar uma Promise com o ID do
 * usuário que criou ou possui o recurso. A flexibilidade desta abordagem permite
 * que você use este middleware com diferentes tipos de recursos sem duplicar código.
 * 
 * @param getResourceOwnerId - Função que extrai o ID do dono do recurso da requisição
 * @returns Um middleware do Express que verifica propriedade ou admin
 * 
 * @example
 * ```typescript
 * // Permite que usuários deletem suas próprias simulações
 * router.delete('/simulations/:id',
 *   authenticate,
 *   requireOwnershipOrAdmin(async (req) => {
 *     const simulation = await prisma.simulation.findUnique({
 *       where: { id: req.params.id }
 *     });
 *     return simulation?.userId;
 *   }),
 *   simulationController.delete
 * );
 * ```
 */
export function requireOwnershipOrAdmin(
    getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | undefined>
) {
    return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
        if (!req.user) {
            throw new ForbiddenError('User authentication required for authorization');
        }

        // Administradores têm acesso total
        if (req.user.role === 'ADMIN') {
            next();
            return;
        }

        // Para usuários regulares, verifica propriedade do recurso
        const resourceOwnerId = await getResourceOwnerId(req);

        if (!resourceOwnerId) {
            throw new ForbiddenError('Resource not found or access denied');
        }

        if (resourceOwnerId !== req.user.id) {
            throw new ForbiddenError('You can only modify your own resources');
        }

        next();
        } catch (error) {
        next(error);
        }
    };
}