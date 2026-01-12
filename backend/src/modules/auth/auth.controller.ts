import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from './auth.validators.js';
import { ValidationError } from '../../shared/errors/app-errors.js';
import { extractTokenFromHeader } from '../../shared/utils/jwt.utils.js';

/**
 * Controller para endpoints de autenticação.
 * 
 * Esta classe contém os handlers para todas as rotas relacionadas à autenticação.
 * Cada método corresponde a um endpoint específico da API. Os controllers são
 * responsáveis por:
 * 
 * 1. Extrair dados da requisição HTTP (body, params, headers)
 * 2. Validar esses dados usando schemas Zod
 * 3. Chamar o service apropriado com dados validados
 * 4. Formatar a resposta de sucesso ou deixar erros serem tratados pelo middleware
 * 
 * Note que os controllers não contêm lógica de negócio. Eles são finos e focados
 * apenas na comunicação HTTP. Toda a lógica de negócio está no service, tornando
 * o código mais testável e organizado.
 */
export class AuthController {
    /**
     * Handler para registro de novos usuários.
     * 
     * Este método implementa o endpoint POST /api/auth/register. Ele recebe os dados
     * do novo usuário no corpo da requisição, valida usando o schema Zod, chama o
     * service de registro, e retorna o usuário criado junto com um token JWT para
     * login automático.
     * 
     * A validação com Zod é crucial aqui. Se os dados não passarem na validação, o
     * Zod lança um ZodError que será capturado pelo middleware de tratamento de erros
     * e convertido em uma resposta HTTP 400 apropriada com detalhes sobre quais campos
     * falharam na validação.
     * 
     * O status code 201 (Created) é usado para indicar que um novo recurso foi criado
     * com sucesso, o que é semanticamente mais correto que 200 (OK) para operações
     * de criação.
     * 
     * @param req - Objeto de requisição do Express
     * @param res - Objeto de resposta do Express
     * @param next - Função para passar controle ao próximo middleware
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Valida o corpo da requisição usando o schema Zod
            // Se a validação falhar, Zod lança ZodError que será tratado pelo middleware
            const validatedData = registerSchema.parse(req.body);

            // Chama o service para registrar o usuário
            const result = await authService.register(validatedData);

            // Retorna resposta de sucesso com código 201 (Created)
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result,
            });
        } catch (error) {
        // Passa o erro para o middleware de tratamento de erros
            next(error);
        }
    }

    /**
     * Handler para login de usuários.
     * 
     * Este método implementa o endpoint POST /api/auth/login. Ele recebe as credenciais
     * do usuário (email e senha), valida, autentica através do service, e retorna
     * um token JWT se as credenciais forem válidas.
     * 
     * A resposta inclui não apenas o token mas também informações do usuário e a data
     * de expiração do token. Isso permite que o frontend saiba quando vai precisar
     * renovar o token ou pedir ao usuário para fazer login novamente.
     * 
     * Por questões de segurança, qualquer erro de autenticação resulta em uma mensagem
     * genérica de "credenciais inválidas", sem distinguir entre email inexistente e
     * senha incorreta. Esta lógica está implementada no service.
     * 
     * @param req - Objeto de requisição do Express
     * @param res - Objeto de resposta do Express
     * @param next - Função para passar controle ao próximo middleware
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Valida as credenciais usando o schema Zod
            const validatedData = loginSchema.parse(req.body);

            // Chama o service para autenticar o usuário
            const result = await authService.login(validatedData);

            // Retorna resposta de sucesso com código 200 (OK)
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handler para logout de usuários.
     * 
     * Este método implementa o endpoint POST /api/auth/logout. Ele extrai o token JWT
     * do header Authorization, chama o service para revogá-lo, e retorna confirmação
     * de logout bem-sucedido.
     * 
     * Este endpoint deve ser protegido pelo middleware de autenticação, garantindo que
     * apenas usuários autenticados possam fazer logout. O middleware já verificou que
     * o token é válido e não está revogado antes de chegarmos aqui.
     * 
     * Após o logout, o token é adicionado à lista negra no banco de dados e não pode
     * mais ser usado para acessar recursos protegidos, mesmo que tecnicamente ainda
     * esteja dentro do prazo de validade.
     * 
     * @param req - Objeto de requisição do Express (deve conter token no header)
     * @param res - Objeto de resposta do Express
     * @param next - Função para passar controle ao próximo middleware
     */
    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Extrai o token do header Authorization
            const token = extractTokenFromHeader(req.headers.authorization);

            if (!token) {
                throw new ValidationError('No token provided');
            }

            // Chama o service para revogar o token
            await authService.logout(token);

            // Retorna confirmação de logout
            res.status(200).json({
                success: true,
                message: 'Logout successful',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handler para solicitação de recuperação de senha.
     * 
     * Este método implementa o endpoint POST /api/auth/forgot-password. Ele recebe o
     * email do usuário, valida, e inicia o processo de recuperação de senha através
     * do service, que gera um token e envia um email com instruções.
     * 
     * Por questões de segurança, sempre retornamos sucesso independentemente do email
     * existir ou não. Se retornássemos erro para emails inexistentes, atacantes poderiam
     * usar isso para descobrir quais emails estão cadastrados no sistema. Para o usuário
     * legítimo, o resultado é o mesmo: se o email existe, ele recebe um email, se não
     * existe, nada acontece.
     * 
     * A mensagem genérica "If the email exists, you will receive instructions" deixa
     * claro que o email pode ou não ser enviado, sem confirmar se o email está cadastrado.
     * 
     * @param req - Objeto de requisição do Express
     * @param res - Objeto de resposta do Express
     * @param next - Função para passar controle ao próximo middleware
     */
    async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Valida o email usando o schema Zod
            const validatedData = forgotPasswordSchema.parse(req.body);

            // Chama o service para iniciar recuperação de senha
            await authService.forgotPassword(validatedData.email);

            // Retorna mensagem genérica por segurança
            res.status(200).json({
                success: true,
                message: 'If the email exists in our system, you will receive password reset instructions',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handler para redefinição de senha.
     * 
     * Este método implementa o endpoint POST /api/auth/reset-password. Ele recebe o
     * token de recuperação (que veio do link no email) e a nova senha, valida ambos,
     * e chama o service para completar a redefinição de senha.
     * 
     * O token é validado no service para verificar se é válido, não expirou, e não foi
     * usado anteriormente. Se todas as verificações passarem, a senha do usuário é
     * atualizada e o token é marcado como usado para prevenir reutilização.
     * 
     * Após a redefinição bem-sucedida, o usuário precisa fazer login novamente com a
     * nova senha. Não geramos automaticamente um token aqui porque seria um risco de
     * segurança: se alguém interceptou o email e usou o token, não queremos logar
     * automaticamente esse atacante.
     * 
     * @param req - Objeto de requisição do Express
     * @param res - Objeto de resposta do Express
     * @param next - Função para passar controle ao próximo middleware
     */
    async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Valida token e nova senha usando o schema Zod
            const validatedData = resetPasswordSchema.parse(req.body);

            // Chama o service para redefinir a senha
            await authService.resetPassword(validatedData.token, validatedData.newPassword);

            // Retorna confirmação de sucesso
            res.status(200).json({
                success: true,
                message: 'Password reset successful. You can now login with your new password',
            });
        } catch (error) {
            next(error);
        }
    }
}

/**
 * Exporta uma instância singleton do controller.
 * 
 * Usamos o padrão singleton porque os controllers não mantêm estado entre requisições,
 * então não há necessidade de criar uma nova instância para cada requisição. Isso
 * também torna mais simples registrar as rotas, já que podemos referenciar diretamente
 * os métodos da instância singleton.
 */
export const authController = new AuthController();