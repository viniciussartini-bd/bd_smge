import { Request } from 'express';

/**
 * Representa um usuário autenticado no sistema.
 * 
 * Este tipo contém as informações mínimas necessárias sobre um usuário
 * que foram extraídas do token JWT e validadas pelo middleware de autenticação.
 * Manter este tipo enxuto é importante porque estas informações são incluídas
 * em toda requisição autenticada.
 */
export interface AuthenticatedUser {
    /**
     * O ID único do usuário no banco de dados
     */
    id: string;
    
    /**
     * O email do usuário, útil para logging e auditoria
     */
    email: string;
    
    /**
     * O papel/role do usuário no sistema (ADMIN ou USER)
     */
    role: string;
    
    /**
     * O nome do usuário, útil para personalização de mensagens
     */
    name: string;
}

/**
 * Estende o tipo Request do Express para incluir o usuário autenticado.
 * 
 * Este tipo é usado em todos os controllers e middlewares que lidam com
 * requisições autenticadas. Ao usar este tipo ao invés do Request padrão,
 * ganhamos type safety completo para acessar informações do usuário.
 * 
 * @example
 * ```typescript
 * async function createPlant(req: AuthenticatedRequest, res: Response) {
 *   // TypeScript sabe que req.user existe e tem todas as propriedades definidas
 *   const userId = req.user.id;
 *   const userRole = req.user.role;
 *   
 *   // Sem AuthenticatedRequest, teríamos que fazer verificações manuais
 *   // e TypeScript não saberia os tipos das propriedades
 * }
 * ```
 */
export interface AuthenticatedRequest extends Request {
    /**
     * O usuário autenticado, adicionado pelo middleware de autenticação.
     * Este campo só está presente em rotas protegidas.
     */
    user: AuthenticatedUser;
}