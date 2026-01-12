import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authRepository } from './auth.repository.js';
import { generateToken, verifyToken } from '../../shared/utils/jwt.utils.js';
import { sendEmail } from '../../config/email.config.js';
import { env } from '../../config/env.config.js';
import {
    UnauthorizedError,
    ConflictError,
    ValidationError,
} from '../../shared/errors/app-errors.js';
import type { AuthResponse } from './auth.types.js';
import type { RegisterInput, LoginInput } from './auth.validators.js';

/**
 * Service para lógica de negócio de autenticação.
 * 
 * Esta classe contém toda a lógica de negócio relacionada à autenticação de usuários.
 * Ela orquestra operações do repository, aplica regras de segurança, gera tokens,
 * envia emails e trata erros de forma apropriada. O service é a camada que realmente
 * implementa as funcionalidades que os testes especificam.
 * 
 * Cada método público do service corresponde a uma funcionalidade completa que será
 * exposta através da API. Os métodos privados são helpers que quebram operações
 * complexas em pedaços menores e reutilizáveis.
 */
export class AuthService {
    /**
     * Registra um novo usuário no sistema.
     * 
     * Este método implementa todo o fluxo de registro: valida que o email não existe,
     * hashea a senha de forma segura, cria o usuário no banco de dados, gera um token
     * JWT para login automático após registro, e formata a resposta apropriada.
     * 
     * O registro bem-sucedido retorna imediatamente um token JWT, permitindo que o
     * usuário seja automaticamente logado após o registro sem precisar fazer login
     * separadamente. Esta é uma boa prática de UX que reduz fricção no onboarding.
     * 
     * @param data - Dados validados do usuário (email, senha, nome)
     * @returns Dados do usuário criado e token JWT
     * @throws ConflictError se o email já estiver em uso
     */
    async register(data: RegisterInput): Promise<AuthResponse> {
        // Verifica se o email já está em uso
        const existingUser = await authRepository.findByEmail(data.email);
        if (existingUser) {
            throw new ConflictError('A user with this email already exists');
        }

        // Hashea a senha com bcrypt usando 10 rounds de salt
        // 10 rounds é o padrão recomendado que balanceia segurança e performance
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Cria o usuário no banco de dados
        const user = await authRepository.create(data.email, hashedPassword, data.name);

        // Gera token JWT para login automático
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            isMobile: false,
        });

        // Calcula a data de expiração do token (7 dias para web)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
            expiresAt,
        };
    }

    /**
     * Autentica um usuário com email e senha.
     * 
     * Este método implementa o fluxo de login: busca o usuário pelo email, verifica
     * se a senha fornecida corresponde ao hash armazenado, e se tudo estiver correto,
     * gera um token JWT. Se o login for de um dispositivo mobile, o token tem duração
     * muito maior para melhor experiência do usuário.
     * 
     * Por questões de segurança, usamos a mesma mensagem de erro genérica tanto para
     * email inexistente quanto para senha incorreta. Isso previne ataques de enumeração
     * onde um atacante tenta descobrir quais emails estão cadastrados no sistema.
     * 
     * @param data - Credenciais do usuário (email, senha, isMobile opcional)
     * @returns Dados do usuário e token JWT
     * @throws UnauthorizedError se as credenciais forem inválidas
     */
    async login(data: LoginInput): Promise<AuthResponse> {
        // Busca o usuário pelo email
        const user = await authRepository.findByEmail(data.email);
        if (!user) {
        // Mensagem genérica para não revelar se o email existe
            throw new UnauthorizedError('Invalid email or password');
        }

        // Verifica se a senha fornecida corresponde ao hash armazenado
        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
        // Mesma mensagem genérica para não distinguir de email inexistente
            throw new UnauthorizedError('Invalid email or password');
        }

        // Gera token JWT com duração apropriada (7 dias web, 365 dias mobile)
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            isMobile: data.isMobile || false,
        });

        // Calcula data de expiração baseado no tipo de dispositivo
        const expiresAt = new Date();
        if (data.isMobile) {
            expiresAt.setDate(expiresAt.getDate() + 365); // 1 ano para mobile
        } else {
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias para web
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
            expiresAt,
        };
    }

    /**
     * Faz logout de um usuário revogando seu token JWT.
     * 
     * Como JWTs são stateless por natureza, não podemos simplesmente "apagar" um token
     * porque ele nunca foi armazenado no servidor. Nossa estratégia é adicionar o token
     * a uma lista negra no banco de dados. Toda requisição autenticada verifica esta
     * lista antes de aceitar o token.
     * 
     * Armazenamos também a data de expiração original do token para que possamos
     * eventualmente limpar tokens expirados da lista negra através de uma tarefa de
     * manutenção, mantendo a tabela em um tamanho gerenciável.
     * 
     * @param token - Token JWT completo que deve ser revogado
     * @returns void
     */
    async logout(token: string): Promise<void> {
        // Verifica e decodifica o token para extrair informações
        const payload = verifyToken(token);

        // Calcula a data de expiração do token baseado no tipo
        const expiresAt = new Date();
        if (payload.isMobile) {
            expiresAt.setDate(expiresAt.getDate() + 365);
        } else {
            expiresAt.setDate(expiresAt.getDate() + 7);
        }

        // Adiciona o token à lista de revogados
        await authRepository.revokeToken(payload.userId, token, expiresAt);
    }

    /**
     * Inicia o processo de recuperação de senha.
     * 
     * Este método implementa o primeiro passo do fluxo de recuperação de senha: gera
     * um token único e seguro, armazena no banco de dados com prazo de expiração de
     * 1 hora, e envia um email ao usuário com um link contendo o token.
     * 
     * Por questões de segurança, sempre retornamos sucesso mesmo se o email não existir
     * no sistema. Se retornássemos erro para emails inexistentes, atacantes poderiam
     * usar isso para enumerar usuários do sistema. Para o usuário legítimo, o resultado
     * é o mesmo: se o email existe, ele receberá um email, se não existe, nada acontece.
     * 
     * @param email - Email do usuário que esqueceu a senha
     * @returns void (sempre retorna sucesso independente do email existir)
     */
    async forgotPassword(email: string): Promise<void> {
        // Busca o usuário pelo email
        const user = await authRepository.findByEmail(email);

        // Se o usuário não existir, retornamos silenciosamente sem erro
        // Isso previne enumeração de usuários através de tentativas de reset
        if (!user) {
            return;
        }

        // Gera um token único e criptograficamente seguro
        const resetToken = this.generateSecureToken();

        // Define expiração de 1 hora (3600000 ms)
        const expiresAt = new Date(Date.now() + 3600000);

        // Salva o token de reset no banco de dados
        await authRepository.createPasswordReset(user.id, resetToken, expiresAt);

        // Envia email com o link de recuperação
        await this.sendPasswordResetEmail(user.email, user.name, resetToken);
    }

    /**
     * Completa o processo de recuperação de senha.
     * 
     * Este método implementa o segundo passo do fluxo de recuperação: valida o token
     * fornecido, verifica se não expirou e não foi usado, hashea a nova senha, atualiza
     * no banco de dados, e marca o token como usado para prevenir reutilização.
     * 
     * A verificação de "já usado" é crucial para segurança. Se alguém interceptou o
     * email com o link de reset, ele não poderá usar o link depois que o usuário
     * legítimo já o usou para redefinir a senha.
     * 
     * @param token - Token de recuperação fornecido no link do email
     * @param newPassword - Nova senha escolhida pelo usuário
     * @returns void
     * @throws ValidationError se o token for inválido, expirado ou já usado
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        // Busca o token no banco de dados
        const resetToken = await authRepository.findPasswordResetToken(token);

        if (!resetToken) {
            throw new ValidationError('Invalid or expired reset token');
        }

        // Verifica se o token já foi usado
        if (resetToken.used) {
            throw new ValidationError('This reset token has already been used');
        }

        // Hashea a nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atualiza a senha do usuário
        await authRepository.updatePassword(resetToken.userId, hashedPassword);

        // Marca o token como usado para prevenir reutilização
        await authRepository.markPasswordResetAsUsed(resetToken.id);
    }

    /**
     * Gera um token seguro para recuperação de senha.
     * 
     * Este método privado gera um token criptograficamente seguro usando o módulo
     * crypto do Node.js. Geramos 32 bytes aleatórios e os convertemos para hexadecimal,
     * resultando em uma string de 64 caracteres que é praticamente impossível de adivinhar.
     * 
     * Usamos randomBytes ao invés de Math.random() porque randomBytes é
     * criptograficamente seguro, enquanto Math.random() é previsível e inadequado
     * para propósitos de segurança.
     * 
     * @returns Token único de 64 caracteres hexadecimais
     */
    private generateSecureToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Envia email de recuperação de senha.
     * 
     * Este método privado encapsula a lógica de envio de email de recuperação. Ele
     * formata o corpo do email em HTML com um link clicável que leva o usuário para
     * a página de redefinição de senha no frontend.
     * 
     * Em uma aplicação real, você configuraria a URL do frontend através de variável
     * de ambiente. Aqui usamos um placeholder que você deve substituir pela URL real
     * do seu frontend em cada ambiente (development, staging, production).
     * 
     * @param email - Email do destinatário
     * @param name - Nome do usuário para personalização
     * @param token - Token de recuperação a ser incluído no link
     */
    private async sendPasswordResetEmail(
        email: string,
        name: string,
        token: string
    ): Promise<void> {
        // URL do frontend onde o usuário irá redefinir a senha
        // Em produção, isso viria de uma variável de ambiente
        const frontendUrl = env.NODE_ENV === 'production' 
        ? 'https://seu-dominio.com' 
        : 'http://localhost:3000';
        
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
            <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                margin: 20px 0;
                }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
            </head>
            <body>
            <div class="container">
                <h2>Password Reset Request</h2>
                <p>Hello ${name},</p>
                <p>You recently requested to reset your password for your Energy Management System account. Click the button below to reset it:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p>${resetUrl}</p>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>Energy Management System</p>
                </div>
            </div>
            </body>
        </html>
        `;

        await sendEmail({
        to: email,
        subject: 'Password Reset Request - Energy Management System',
        html: htmlContent,
        text: `Hello ${name},\n\nYou requested a password reset. Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
        });
    }
}

/**
 * Exporta uma instância singleton do service.
 * 
 * Usamos o padrão singleton porque o service não mantém estado entre chamadas,
 * então não há necessidade de múltiplas instâncias. Isso também facilita a
 * injeção de dependências e torna o código mais simples.
 */
export const authService = new AuthService();