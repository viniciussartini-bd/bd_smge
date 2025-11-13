import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.config.js';
import { UnauthorizedError } from '../errors/app-errors.js';

/**
 * Interface que define a estrutura do payload do JWT.
 * 
 * O payload é o conteúdo do token, as informações que são codificadas dentro dele.
 * É importante manter o payload enxuto porque ele é enviado em toda requisição.
 * Incluímos apenas as informações essenciais que precisamos ter disponíveis
 * imediatamente sem precisar consultar o banco de dados.
 * 
 * A propriedade isMobile é particularmente importante porque tokens mobile têm
 * tempo de expiração muito maior, então precisamos saber qual tipo de token é
 * para aplicar as regras corretas.
 */
export interface JwtPayload {
    /**
     * ID único do usuário no banco de dados
     */
    userId: string;

    /**
     * Email do usuário, útil para logging e auditoria
     */
    email: string;

    /**
     * Papel do usuário no sistema (ADMIN ou USER)
     */
    role: string;

    /**
     * Nome do usuário para personalização
     */
    name: string;

    /**
     * Indica se este token foi gerado para uma aplicação mobile.
     * Tokens mobile têm tempo de expiração muito maior.
     */
    isMobile: boolean;
}

/**
 * Gera um novo token JWT para um usuário.
 * 
 * Esta função encapsula toda a lógica de criação de tokens. Ela recebe as
 * informações do usuário e automaticamente aplica o tempo de expiração correto
 * baseado se é um token mobile ou web. A função também garante que sempre
 * incluímos todas as informações necessárias no payload de forma consistente.
 * 
 * O tempo de expiração diferenciado para mobile existe porque aplicativos mobile
 * geralmente mantêm o usuário logado por períodos muito longos, enquanto aplicações
 * web por questões de segurança expiram tokens mais rapidamente, especialmente
 * se o usuário está acessando de computadores compartilhados.
 * 
 * @param payload - Informações do usuário que serão codificadas no token
 * @returns String contendo o token JWT assinado
 * 
 * @example
 * ```typescript
 * const token = generateToken({
 *   userId: user.id,
 *   email: user.email,
 *   role: user.role,
 *   name: user.name,
 *   isMobile: false
 * });
 * ```
 */
export function generateToken(payload: JwtPayload): string {
    const expiresIn: SignOptions["expiresIn"] = payload.isMobile
    ? env.JWT_EXPIRES_IN_MOBILE
    : env.JWT_EXPIRES_IN;


    const options: SignOptions = {
        expiresIn,
        issuer: 'energy-management-system',
        audience: 'energy-management-users',
    };

    return jwt.sign(payload, env.JWT_SECRET, options);

}

/**
 * Verifica e decodifica um token JWT.
 * 
 * Esta função é o coração do processo de autenticação. Ela recebe um token,
 * verifica se ele foi assinado com nossa chave secreta, se não está expirado,
 * e se os claims (issuer e audience) estão corretos. Se todas as verificações
 * passarem, ela retorna o payload decodificado.
 * 
 * A verificação de issuer e audience adiciona uma camada extra de segurança.
 * Se alguém conseguir acesso à nossa chave secreta e gerar tokens, mas não
 * souber os valores corretos de issuer e audience, os tokens ainda serão
 * rejeitados. É como ter uma fechadura com duas chaves diferentes.
 * 
 * @param token - O token JWT a ser verificado
 * @returns O payload decodificado se o token for válido
 * @throws UnauthorizedError se o token for inválido, expirado ou malformado
 * 
 * @example
 * ```typescript
 * try {
 *   const payload = verifyToken(token);
 *   console.log('User ID:', payload.userId);
 * } catch (error) {
 *   // Token inválido
 * }
 * ```
 */
export function verifyToken(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            issuer: 'energy-management-system',
            audience: 'energy-management-users',
        }) as JwtPayload;

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token has expired. Please login again.');
        }

        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid token. Please login again.');
        }

        throw new UnauthorizedError('Token verification failed.');
    }
}

/**
 * Decodifica um token sem verificar sua assinatura.
 * 
 * Esta função é útil em situações específicas onde você precisa ler o conteúdo
 * de um token mas não precisa garantir sua validade. Por exemplo, quando você
 * está revogando um token durante o logout, você precisa extrair o userId dele
 * para saber de quem é o token, mas não precisa verificar se ele ainda é válido
 * porque você vai revogá-lo de qualquer forma.
 * 
 * IMPORTANTE: Esta função não deve ser usada para autenticação. Use sempre
 * verifyToken quando estiver autenticando um usuário. Esta função é apenas
 * para casos específicos onde a verificação não é necessária ou seria redundante.
 * 
 * @param token - O token JWT a ser decodificado
 * @returns O payload decodificado ou null se o token for malformado
 * 
 * @example
 * ```typescript
 * // Durante logout, não precisamos verificar o token, apenas extrair o userId
 * const payload = decodeToken(token);
 * if (payload) {
 *   await revokeToken(payload.userId, token);
 * }
 * ```
 */
export function decodeToken(token: string): JwtPayload | null {
    try {
        return jwt.decode(token) as JwtPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Extrai o token do header Authorization.
 * 
 * Esta função padroniza a extração do token do header HTTP. O padrão Bearer
 * authentication é amplamente usado em APIs REST, onde o token é enviado no
 * formato "Bearer <token>". Esta função verifica se o header está presente,
 * se segue o formato correto, e extrai apenas a parte do token.
 * 
 * Centralizar esta lógica em uma função evita duplicação de código e garante
 * que sempre fazemos a extração da mesma forma em todos os lugares.
 * 
 * @param authorizationHeader - O valor do header Authorization da requisição
 * @returns O token extraído ou null se não houver token válido
 * 
 * @example
 * ```typescript
 * const token = extractTokenFromHeader(req.headers.authorization);
 * if (!token) {
 *   throw new UnauthorizedError('No token provided');
 * }
 * ```
 */
export function extractTokenFromHeader(authorizationHeader?: string): string | null {
    if (!authorizationHeader) {
        return null;
    }

    const parts = authorizationHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}