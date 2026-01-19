/**
 * Resposta padrão da API para operações com perfis.
 */
export interface ProfileResponse {
    id: string;
    fantasyName: string;
    cnpj: string;
    zipCode: string;
    address: string;
    city: string;
    state: string;
    phone: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Perfil com relacionamento do usuário incluído.
 */
export interface ProfileWithUser extends ProfileResponse {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}