import { Permission, rolePermissions } from '../types/permissions.types.js';

/**
 * Verifica se um determinado role possui uma permissão específica.
 * 
 * Esta função é o coração do sistema de autorização. Ela recebe o papel do usuário
 * e a permissão que queremos verificar, e retorna true ou false indicando se
 * aquele papel tem autorização para executar aquela ação.
 * 
 * @param role - O papel do usuário (ADMIN ou USER)
 * @param permission - A permissão que queremos verificar
 * @returns true se o role possui a permissão, false caso contrário
 * 
 * @example
 * ```typescript
 * const canCreatePlant = hasPermission('ADMIN', Permission.CREATE_PLANT);
 * // retorna true
 * 
 * const userCanCreatePlant = hasPermission('USER', Permission.CREATE_PLANT);
 * // retorna false
 * ```
 */
export function hasPermission(role: string, permission: Permission): boolean {
    const permissions = rolePermissions[role];
    
    if (!permissions) {
        return false;
    }
    
    return permissions.includes(permission);
}

/**
 * Verifica se um role possui todas as permissões fornecidas.
 * 
 * Esta função é útil quando uma operação requer múltiplas permissões
 * simultaneamente. Por exemplo, uma operação que tanto visualiza quanto
 * modifica dados precisaria verificar ambas as permissões.
 * 
 * @param role - O papel do usuário
 * @param permissions - Array de permissões que devem ser verificadas
 * @returns true se o role possui todas as permissões, false se faltar qualquer uma
 * 
 * @example
 * ```typescript
 * const canViewAndEdit = hasAllPermissions('ADMIN', [
 *   Permission.VIEW_PLANT,
 *   Permission.UPDATE_PLANT
 * ]);
 * // retorna true para ADMIN
 * ```
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
    return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Verifica se um role possui pelo menos uma das permissões fornecidas.
 * 
 * Esta função é útil para casos onde múltiplas permissões diferentes podem
 * autorizar a mesma operação. Por exemplo, tanto poder criar quanto poder
 * atualizar um recurso poderia permitir acesso a um formulário de edição.
 * 
 * @param role - O papel do usuário
 * @param permissions - Array de permissões, onde apenas uma precisa ser satisfeita
 * @returns true se o role possui pelo menos uma das permissões
 * 
 * @example
 * ```typescript
 * const canAccessForm = hasAnyPermission('USER', [
 *   Permission.CREATE_PLANT,
 *   Permission.VIEW_PLANT
 * ]);
 * // retorna true porque USER tem VIEW_PLANT, mesmo não tendo CREATE_PLANT
 * ```
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
    return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Retorna todas as permissões de um determinado role.
 * 
 * Esta função é útil principalmente para debugging e para construir
 * interfaces de usuário que precisam saber todas as capacidades de um usuário.
 * Por exemplo, um menu lateral poderia usar esta função para decidir quais
 * opções mostrar baseado nas permissões do usuário logado.
 * 
 * @param role - O papel do usuário
 * @returns Array com todas as permissões do role, ou array vazio se o role não existir
 * 
 * @example
 * ```typescript
 * const adminPermissions = getRolePermissions('ADMIN');
 * // retorna array com todas as permissões disponíveis no sistema
 * 
 * const userPermissions = getRolePermissions('USER');
 * // retorna array apenas com permissões de visualização e algumas ações específicas
 * ```
 */
export function getRolePermissions(role: string): Permission[] {
    return rolePermissions[role] || [];
}

/**
 * Verifica se um role é administrador.
 * 
 * Esta é uma função de conveniência que torna o código mais legível
 * em situações onde precisamos simplesmente saber se estamos lidando
 * com um administrador. É mais semântico escrever isAdmin(role) do
 * que role === 'ADMIN' espalhado pelo código.
 * 
 * @param role - O papel do usuário
 * @returns true se o role for ADMIN
 * 
 * @example
 * ```typescript
 * if (isAdmin(user.role)) {
 *   // Código específico para administradores
 * }
 * ```
 */
export function isAdmin(role: string): boolean {
    return role === 'ADMIN';
}

/**
 * Verifica se um usuário pode acessar um recurso específico.
 * 
 * Esta função implementa uma verificação mais sofisticada que leva em conta
 * não apenas as permissões do usuário, mas também a propriedade do recurso.
 * Por exemplo, usuários regulares podem deletar suas próprias simulações,
 * mas não simulações de outros usuários.
 * 
 * @param userRole - O papel do usuário que está tentando acessar
 * @param userId - O ID do usuário que está tentando acessar
 * @param resourceOwnerId - O ID do usuário que criou/possui o recurso
 * @param permission - A permissão necessária para acessar o recurso
 * @returns true se o usuário pode acessar o recurso
 * 
 * @example
 * ```typescript
 * // Admin pode acessar qualquer simulação
 * canAccessResource('ADMIN', 'user-123', 'user-456', Permission.DELETE_OWN_SIMULATION);
 * // retorna true
 * 
 * // Usuário regular só pode deletar suas próprias simulações
 * canAccessResource('USER', 'user-123', 'user-123', Permission.DELETE_OWN_SIMULATION);
 * // retorna true
 * 
 * canAccessResource('USER', 'user-123', 'user-456', Permission.DELETE_OWN_SIMULATION);
 * // retorna false
 * ```
 */
export function canAccessResource(
    userRole: string,
    userId: string,
    resourceOwnerId: string,
    permission: Permission
    ): boolean {
        // Admins sempre têm acesso a todos os recursos
        if (isAdmin(userRole)) {
            return true;
        }
        
        // Para permissões que envolvem "próprio" (own), verifica propriedade
        if (permission === Permission.DELETE_OWN_SIMULATION) {
            return userId === resourceOwnerId && hasPermission(userRole, permission);
        }
        
        // Para outras permissões, apenas verifica se tem a permissão
        return hasPermission(userRole, permission);
}