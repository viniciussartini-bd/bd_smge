import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser } from '../helpers.js';
import * as emailConfig from '../../config/email.config.js';

/**
 * Suite de testes para a funcionalidade de recuperação de senha.
 * 
 * A recuperação de senha é um fluxo crítico de segurança que envolve duas etapas:
 * 1. Solicitação de recuperação: usuário fornece seu email e recebe um link por email
 * 2. Redefinição de senha: usuário clica no link e define uma nova senha
 * 
 * Estes testes cobrem ambas as etapas, incluindo casos de erro como tokens inválidos,
 * tokens expirados, e tentativas de redefinir senha sem token válido. Também testamos
 * aspectos de segurança como garantir que tentativas de recuperação não revelem se
 * um email existe no sistema.
 */

/**
 * Testes para solicitação de recuperação de senha (esqueci minha senha)
 */
describe('POST /api/auth/forgot-password', () => {
    /**
     * Este teste verifica que o fluxo de solicitação de recuperação funciona corretamente
     * quando um email válido é fornecido. O sistema deve criar um token de recuperação,
     * salvá-lo no banco de dados com prazo de expiração, e (em produção) enviar um email.
     * 
     * Para testes, mockamos o envio de email para evitar realmente enviar emails durante
     * os testes, o que seria lento e poderia falhar por problemas de rede ou configuração.
     */
    it('should send password reset email for valid email', async () => {
        // Arrange: Criar um usuário existente
        const testUser = await createTestUser({
            email: 'forgot@example.com',
            password: 'Test@123456',
        });

        // Mock da função de envio de email para não enviar emails reais durante os testes
        const sendEmailSpy = vi.spyOn(emailConfig, 'sendEmail').mockResolvedValue();

        // Act: Solicitar recuperação de senha
        const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

        // Assert: Verificar resposta de sucesso
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('email');

        // Assert: Verificar que um token foi criado no banco de dados
        const resetToken = await prisma.passwordReset.findFirst({
            where: { userId: testUser.id, used: false },
            orderBy: { createdAt: 'desc' },
        });

        expect(resetToken).toBeDefined();
        expect(resetToken?.token).toBeDefined();
        expect(resetToken?.expiresAt).toBeInstanceOf(Date);
        expect(resetToken?.expiresAt.getTime()).toBeGreaterThan(Date.now());

        // Assert: Verificar que a função de envio de email foi chamada
        expect(sendEmailSpy).toHaveBeenCalledOnce();
        expect(sendEmailSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                to: testUser.email,
                subject: expect.stringContaining('password'),
            })
        );

        // Cleanup: Restaurar a função original
        sendEmailSpy.mockRestore();
    });

    /**
     * Este teste verifica um aspecto importante de segurança: quando alguém solicita
     * recuperação de senha para um email que não existe, não devemos revelar isso.
     * Devemos retornar a mesma resposta de sucesso para prevenir enumeração de usuários.
     * 
     * Se retornássemos erro para emails inexistentes, atacantes poderiam usar isso
     * para descobrir quais emails estão cadastrados no sistema, facilitando ataques
     * direcionados.
     */
    it('should return success even for non-existent email (security)', async () => {
        // Arrange: Mock do envio de email
        const sendEmailSpy = vi.spyOn(emailConfig, 'sendEmail').mockResolvedValue();

        // Act: Solicitar recuperação para email que não existe
        const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

        // Assert: Verificar que recebemos a mesma resposta de sucesso
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('email');

        // Assert: Verificar que nenhum email foi realmente enviado
        expect(sendEmailSpy).not.toHaveBeenCalled();

        // Assert: Verificar que nenhum token foi criado
        const resetTokens = await prisma.passwordReset.findMany();
        expect(resetTokens.length).toBe(0);

        sendEmailSpy.mockRestore();
    });

    /**
     * Este teste verifica validação de dados. Emails malformados devem ser rejeitados
     * antes mesmo de tentarmos processá-los.
     */
    it('should return 400 with invalid email format', async () => {
        // Act: Enviar email inválido
        const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);

        // Assert: Verificar erro de validação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });

    /**
     * Este teste verifica que o campo email é obrigatório.
     */
    it('should return 400 if email is missing', async () => {
        // Act: Enviar requisição sem email
        const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

        // Assert: Verificar erro de validação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });

    /**
     * Este teste verifica que múltiplas solicitações de recuperação podem ser feitas
     * para o mesmo usuário. Tokens antigos não usados devem continuar válidos até
     * expirarem ou serem usados. Isso é importante porque o usuário pode não receber
     * o primeiro email (spam, etc) e tentar novamente.
     */
    it('should allow multiple password reset requests', async () => {
        // Arrange: Criar usuário e mock de email
        const testUser = await createTestUser({
            email: 'multiple@example.com',
        });
        const sendEmailSpy = vi.spyOn(emailConfig, 'sendEmail').mockResolvedValue();

        // Act: Fazer duas solicitações de recuperação
        await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

        await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

        // Assert: Verificar que dois tokens foram criados
        const resetTokens = await prisma.passwordReset.findMany({
            where: { userId: testUser.id },
        });
        expect(resetTokens.length).toBe(2);

        // Assert: Ambos os tokens devem ser diferentes
        expect(resetTokens[0].token).not.toBe(resetTokens[1].token);

        sendEmailSpy.mockRestore();
    });
});

/**
 * Testes para redefinição de senha usando token
 */
describe('POST /api/auth/reset-password', () => {
    /**
     * Este teste verifica o fluxo completo de redefinição de senha. Um usuário com
     * token válido consegue definir uma nova senha, o token é marcado como usado,
     * e a nova senha é salva hasheada no banco de dados.
     */
    it('should reset password with valid token', async () => {
        // Arrange: Criar usuário e token de recuperação
        const testUser = await createTestUser({
            email: 'reset@example.com',
            password: 'OldPassword@123',
        });

        const resetToken = await prisma.passwordReset.create({
            data: {
                userId: testUser.id,
                token: 'valid-reset-token-123',
                expiresAt: new Date(Date.now() + 3600000), // expira em 1 hora
            },
        });

        // Act: Redefinir senha usando o token
        const newPassword = 'NewPassword@456';
        const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: resetToken.token,
            newPassword: newPassword,
        })
        .expect(200);

        // Assert: Verificar resposta de sucesso
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('password');

        // Assert: Verificar que o token foi marcado como usado
        const usedToken = await prisma.passwordReset.findUnique({
            where: { token: resetToken.token },
        });

        expect(usedToken?.used).toBe(true);

        // Assert: Verificar que a senha foi atualizada no banco
        const updatedUser = await prisma.user.findUnique({
            where: { id: testUser.id },
        });

        expect(updatedUser?.password).not.toBe(testUser.password);
        expect(updatedUser?.password).not.toBe(newPassword); // deve estar hasheada

        // Assert: Verificar que o login funciona com a nova senha
        const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
            email: testUser.email,
            password: newPassword,
        })
        .expect(200);

        expect(loginResponse.body.data).toHaveProperty('token');
    });

    /**
     * Este teste verifica que tokens inválidos são rejeitados.
     */
    it('should return 400 with invalid token', async () => {
        // Act: Tentar redefinir senha com token que não existe
        const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: 'invalid-token-xyz',
            newPassword: 'NewPassword@123',
        })
        .expect(400);

        // Assert: Verificar erro
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message.toLowerCase()).toContain('invalid');
    });

    /**
     * Este teste verifica que tokens expirados não podem ser usados.
     */
    it('should return 400 with expired token', async () => {
        // Arrange: Criar usuário e token expirado
        const testUser = await createTestUser({
            email: 'expired@example.com',
        });

        const expiredToken = await prisma.passwordReset.create({
            data: {
                userId: testUser.id,
                token: 'expired-token-123',
                expiresAt: new Date(Date.now() - 3600000), // expirou há 1 hora
            },
        });

        // Act: Tentar usar token expirado
        const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: expiredToken.token,
            newPassword: 'NewPassword@123',
        })
        .expect(400);

        // Assert: Verificar erro de token expirado
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message.toLowerCase()).toContain('expired');
    });

    /**
     * Este teste verifica que tokens já usados não podem ser reutilizados.
     * Isso previne que alguém que interceptou o email use o link múltiplas vezes.
     */
    it('should return 400 with already used token', async () => {
        // Arrange: Criar usuário e token já usado
        const testUser = await createTestUser({
            email: 'used@example.com',
        });

        const usedToken = await prisma.passwordReset.create({
            data: {
                userId: testUser.id,
                token: 'used-token-123',
                expiresAt: new Date(Date.now() + 3600000),
                used: true, // já foi usado
            },
        });

        // Act: Tentar usar token já usado
        const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: usedToken.token,
            newPassword: 'NewPassword@123',
        })
        .expect(400);

        // Assert: Verificar erro
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message.toLowerCase()).toContain('used');
    });

    /**
     * Este teste verifica que a nova senha deve atender aos requisitos de segurança.
     */
    it('should return 400 if new password is too weak', async () => {
        // Arrange: Criar usuário e token válido
        const testUser = await createTestUser({
            email: 'weak@example.com',
        });

        const resetToken = await prisma.passwordReset.create({
            data: {
                userId: testUser.id,
                token: 'valid-token-456',
                expiresAt: new Date(Date.now() + 3600000),
            },
        });

        // Act: Tentar definir senha fraca
        const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: resetToken.token,
            newPassword: 'weak', // senha muito curta e simples
        })
        .expect(400);

        // Assert: Verificar erro de validação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });

    /**
     * Este teste verifica validação de campos obrigatórios.
     */
    it('should return 400 if required fields are missing', async () => {
        // Act: Enviar apenas o token sem a nova senha
        const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
            token: 'some-token',
        })
        .expect(400);

        // Assert: Verificar erro de validação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });
});