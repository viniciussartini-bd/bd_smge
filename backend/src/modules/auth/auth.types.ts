/**
 * Interface que representa a resposta de uma autenticação bem-sucedida.
 * 
 * Esta estrutura é retornada tanto no registro quanto no login, fornecendo
 * ao cliente todas as informações necessárias para começar a usar a API
 * de forma autenticada. O token é o mais importante, sendo o passaporte
 * que o cliente usará em todas as requisições subsequentes.
 */
export interface AuthResponse {
    /**
     * Informações públicas do usuário autenticado. Não incluímos dados sensíveis
     * como senha (mesmo hasheada) nesta estrutura.
     */
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };

    /**
     * Token JWT que deve ser incluído em requisições futuras para autenticação.
     * Este token contém informações do usuário codificadas e assinadas
     * criptograficamente.
     */
    token: string;

    /**
     * Timestamp de quando o token expira. Útil para que o frontend saiba quando
     * precisa solicitar um novo token ou pedir ao usuário para fazer login novamente.
     */
    expiresAt: Date;
}

/**
 * Interface para dados de criação de token de recuperação de senha.
 * 
 * Esta estrutura é usada internamente pelo service quando cria um token
 * de recuperação de senha. Ela contém todas as informações necessárias
 * para enviar o email de recuperação ao usuário.
 */
export interface PasswordResetToken {
    /**
     * Token único gerado aleatoriamente que será incluído no link de recuperação.
     */
    token: string;

    /**
     * Email do usuário que solicitou a recuperação.
     */
    email: string;

    /**
     * Quando o token expira. Tokens de recuperação têm vida curta (geralmente
     * 1 hora) por questões de segurança.
     */
    expiresAt: Date;
}