import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database.config.js';
import { UnauthorizedError } from '../errors/app-errors.js';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.utils.js';
import { AuthenticatedRequest } from '../types/express.types.js';

/**
 * Middleware de autenticação que protege rotas privadas.
 * 
 * Este middleware é o guardião das rotas protegidas da aplicação. Ele executa
 * uma série de verificações para garantir que a requisição vem de um usuário
 * autenticado válido. O processo de verificação inclui várias etapas importantes
 * que trabalham juntas para garantir segurança robusta.
 * 
 * Primeiro, verifica se um token foi fornecido no header Authorization. Sem token,
 * não há como saber quem está fazendo a requisição, então rejeitamos imediatamente.
 * 
 * Segundo, verifica se o token é válido criptograficamente, ou seja, se foi
 * realmente assinado por nossa aplicação e não foi adulterado. Também verifica
 * se o token não está expirado.
 * 
 * Terceiro, e muito importante, verifica se o token não foi revogado. Quando um
 * usuário faz logout, adicionamos seu token à lista de tokens revogados. Esta
 * verificação garante que mesmo que alguém tenha uma cópia do token de outra
 * pessoa, se aquela pessoa fez logout, o token não funcionará mais.
 * 
 * Quarto, verifica se o usuário ainda existe no banco de dados. Isso protege
 * contra o caso onde um token ainda é válido mas o usuário foi deletado do sistema.
 * 
 * Se todas essas verificações passarem, o middleware adiciona as informações do
 * usuário ao objeto request, tornando-as disponíveis para todos os controllers
 * e middlewares subsequentes na cadeia.
 * 
 * @param req - Objeto de requisição do Express
 * @param res - Objeto de resposta do Express
 * @param next - Função para passar o controle para o próximo middleware
 * @throws UnauthorizedError se qualquer verificação de autenticação falhar
 */
export async function authenticate(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
    ): Promise<void> {
        try {
        // Extrai o token do header Authorization
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            throw new UnauthorizedError('Authentication token is required');
        }

        // Verifica e decodifica o token
        const payload = verifyToken(token);

        // Verifica se o token foi revogado (logout)
        const revokedToken = await prisma.revokedToken.findUnique({
            where: { token },
        });

        if (revokedToken) {
            throw new UnauthorizedError('Token has been revoked. Please login again.');
        }

        // Verifica se o usuário ainda existe no sistema
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            });

            if (!user) {
                throw new UnauthorizedError('User not found. Please login again.');
            }

            // Adiciona as informações do usuário ao request para uso nos controllers
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };

            next();
        } catch (error) {
            // Se o erro já é uma UnauthorizedError, repassa-o diretamente
            if (error instanceof UnauthorizedError) {
                next(error);
            return;
            }

            // Para outros erros, converte para UnauthorizedError
            next(new UnauthorizedError('Authentication failed'));
        }
}