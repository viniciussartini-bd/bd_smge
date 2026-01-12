import { prisma } from '../../config/database.config.js';
import { User, PasswordReset, RevokedToken } from '@prisma/client';

/**
 * Repository para operações de autenticação no banco de dados.
 * 
 * Esta classe encapsula todas as operações de banco de dados relacionadas à
 * autenticação. Ela serve como uma camada de abstração sobre o Prisma Client,
 * fornecendo uma API mais limpa e focada para o service usar. Se no futuro
 * decidíssemos trocar o Prisma por outro ORM ou até usar queries SQL diretas,
 * precisaríamos modificar apenas este repository, não todo o código que usa
 * operações de autenticação.
 * 
 * Cada método aqui tem uma única responsabilidade bem definida, tornando o
 * código fácil de testar e manter. Os métodos retornam tipos do Prisma ou null,
 * nunca lançam erros de negócio, apenas erros técnicos de banco de dados que
 * serão tratados em camadas superiores.
 */
export class AuthRepository {
    /**
     * Busca um usuário pelo email.
     * 
     * Este método é usado principalmente no login para verificar se o usuário existe
     * e obter seus dados para validação de senha. Retorna null se o usuário não for
     * encontrado ao invés de lançar um erro, permitindo que o service decida como
     * lidar com essa situação (geralmente retornando erro genérico de credenciais
     * inválidas por questões de segurança).
     * 
     * @param email - Email do usuário (case-insensitive devido à normalização no schema)
     * @returns O usuário encontrado ou null
     */
    async findByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    /**
     * Busca um usuário pelo ID.
     * 
     * Este método é útil para operações que já têm o ID do usuário, como validação
     * de token JWT ou verificação de existência durante logout. É mais eficiente
     * que buscar por email quando você já tem o ID disponível.
     * 
     * @param id - UUID do usuário
     * @returns O usuário encontrado ou null
     */
    async findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id },
        });
    }

    /**
     * Cria um novo usuário no banco de dados.
     * 
     * Este método é usado no registro de novos usuários. Ele recebe os dados já
     * validados e com a senha já hasheada, pois a responsabilidade de validar e
     * hashear pertence ao service, não ao repository. O repository apenas persiste
     * os dados que recebe.
     * 
     * Note que selecionamos explicitamente quais campos retornar para evitar
     * vazar a senha hasheada desnecessariamente. Embora seja hasheada e segura,
     * seguir o princípio de privilégio mínimo significa não expor dados que não
     * são necessários.
     * 
     * @param email - Email do usuário
     * @param password - Senha já hasheada com bcrypt
     * @param name - Nome do usuário
     * @returns O usuário criado sem a senha
     */
    async create(email: string, password: string, name: string): Promise<Omit<User, 'password'>> {
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password,
                name,
                role: 'USER', // Usuários novos sempre começam como USER, não ADMIN
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }

    /**
     * Atualiza a senha de um usuário.
     * 
     * Este método é usado na recuperação de senha após o usuário validar seu token
     * de reset. Recebe a senha já hasheada porque o hashing é responsabilidade do
     * service, mantendo o repository focado apenas em operações de banco de dados.
     * 
     * @param userId - ID do usuário
     * @param hashedPassword - Nova senha já hasheada
     * @returns O usuário atualizado
     */
    async updatePassword(userId: string, hashedPassword: string): Promise<User> {
        return prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    }

    /**
     * Cria um token de recuperação de senha.
     * 
     * Este método cria um registro na tabela de tokens de reset com o token gerado,
     * associado ao usuário, e com um prazo de expiração. O token deve ser único e
     * criptograficamente seguro, mas a geração dele é responsabilidade do service,
     * não do repository.
     * 
     * @param userId - ID do usuário que solicitou a recuperação
     * @param token - Token único gerado para esta recuperação
     * @param expiresAt - Data/hora quando o token expira
     * @returns O registro de reset criado
     */
    async createPasswordReset(
        userId: string,
        token: string,
        expiresAt: Date
    ): Promise<PasswordReset> {
        return prisma.passwordReset.create({
            data: {
                userId,
                token,
                expiresAt,
                used: false,
            },
        });
    }

    /**
     * Busca um token de recuperação de senha válido.
     * 
     * Este método procura um token que corresponda à string fornecida, não tenha
     * sido usado, e ainda não tenha expirado. Esta combinação de critérios garante
     * que apenas tokens legítimos e dentro do prazo possam ser usados para recuperação.
     * 
     * A verificação de expiração no where clause aproveita os índices do banco de
     * dados para performance, ao invés de buscar o token e verificar expiração
     * em memória depois.
     * 
     * @param token - Token de recuperação fornecido pelo usuário
     * @returns O registro de reset se for válido, ou null
     */
    async findPasswordResetToken(token: string): Promise<PasswordReset | null> {
        return prisma.passwordReset.findFirst({
            where: {
                token,
                used: false,
                expiresAt: {
                gt: new Date(), // gt = greater than, verifica se expira no futuro
                },
            },
        });
    }

    /**
     * Marca um token de recuperação como usado.
     * 
     * Após o usuário redefinir sua senha com sucesso usando um token, precisamos
     * marcar esse token como usado para prevenir reutilização. Se alguém interceptou
     * o email com o link de reset, ele não poderá usar o link novamente depois que
     * o usuário legítimo já o usou.
     * 
     * @param tokenId - ID do registro de token na tabela
     * @returns O token atualizado
     */
    async markPasswordResetAsUsed(tokenId: string): Promise<PasswordReset> {
        return prisma.passwordReset.update({
            where: { id: tokenId },
            data: { used: true },
        });
    }

    /**
     * Adiciona um token JWT à lista de tokens revogados.
     * 
     * Este método é usado durante o logout para adicionar o token do usuário à
     * lista negra, efetivamente invalidando-o mesmo que tecnicamente ainda esteja
     * dentro do prazo de validade. Armazenamos a data de expiração para que
     * possamos eventualmente limpar tokens expirados da tabela, mantendo-a gerenciável.
     * 
     * @param userId - ID do usuário que está fazendo logout
     * @param token - Token JWT completo que deve ser revogado
     * @param expiresAt - Data de expiração original do token
     * @returns O registro de token revogado criado
     */
    async revokeToken(userId: string, token: string, expiresAt: Date): Promise<RevokedToken> {
        return prisma.revokedToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
    }

    /**
     * Verifica se um token está na lista de revogados.
     * 
     * Este método é chamado em toda requisição autenticada para verificar se o
     * token fornecido foi revogado através de logout. A verificação deve ser rápida,
     * por isso temos um índice único no campo token na tabela. Retorna o registro
     * se encontrado ou null se não estiver revogado.
     * 
     * @param token - Token JWT a ser verificado
     * @returns O registro se o token estiver revogado, ou null
     */
    async isTokenRevoked(token: string): Promise<RevokedToken | null> {
        return prisma.revokedToken.findUnique({
            where: { token },
        });
    }

    /**
     * Remove tokens revogados que já expiraram.
     * 
     * Este método é útil para manutenção periódica do banco de dados. Tokens que
     * já expiraram não precisam mais estar na lista de revogados porque eles não
     * seriam aceitos de qualquer forma. Executar este método periodicamente (por
     * exemplo, uma vez por dia via cron job) mantém a tabela de tokens revogados
     * em um tamanho gerenciável.
     * 
     * A operação deleteMany é eficiente porque usa índices do banco e não requer
     * carregar os registros em memória antes de deletá-los.
     * 
     * @returns Informação sobre quantos tokens foram deletados
     */
    async cleanupExpiredTokens(): Promise<{ count: number }> {
        return prisma.revokedToken.deleteMany({
            where: {
                expiresAt: {
                lt: new Date(), // lt = less than, tokens que expiraram no passado
                },
            },
        });
    }

    /**
     * Remove tokens de reset de senha que já expiraram.
     * 
     * Similar ao cleanup de tokens revogados, este método mantém a tabela de
     * resets de senha limpa removendo tokens que já não são mais válidos. Tokens
     * de reset geralmente têm vida muito curta (1 hora é comum), então esta tabela
     * pode acumular muitos registros obsoletos se não for limpa periodicamente.
     * 
     * @returns Informação sobre quantos tokens de reset foram deletados
     */
    async cleanupExpiredPasswordResets(): Promise<{ count: number }> {
        return prisma.passwordReset.deleteMany({
            where: {
                OR: [
                    {
                        expiresAt: {
                        lt: new Date(),
                        },
                    },
                    {
                        used: true,
                        createdAt: {
                        // Remove tokens usados que têm mais de 30 dias
                        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        },
                    },
                ],
            },
        });
    }
}

/**
 * Exporta uma instância singleton do repository.
 * 
 * Usamos o padrão singleton para o repository porque não há necessidade de
 * múltiplas instâncias - ele não mantém estado, apenas fornece métodos que
 * operam sobre o banco de dados compartilhado. Isso também torna mais fácil
 * injetar o mesmo repository em diferentes services sem precisar gerenciar
 * instâncias manualmente.
 */
export const authRepository = new AuthRepository();