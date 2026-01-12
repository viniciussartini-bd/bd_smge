import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, generateTestToken, createAuthHeader } from '../helpers.js';

/**
 * Suite de testes para a funcionalidade de logout.
 * 
 * O logout em sistemas baseados em JWT é conceitualmente diferente de sistemas
 * baseados em sessão. Como JWTs são stateless por natureza, não podemos simplesmente
 * "apagar" o token do servidor porque ele nunca foi armazenado lá em primeiro lugar.
 * Nossa estratégia é adicionar tokens revogados a uma lista negra no banco de dados,
 * e verificar essa lista em cada requisição autenticada.
 * 
 * Estes testes verificam que o processo de logout funciona corretamente, que tokens
 * são adequadamente adicionados à lista de revogados, e que tokens revogados não
 * podem mais ser usados para acessar recursos protegidos.
 */
describe('POST /api/auth/logout', () => {
    /**
     * Este teste verifica o fluxo completo de logout bem-sucedido. Um usuário
     * autenticado faz logout, o token é adicionado à lista de tokens revogados,
     * e esse mesmo token não pode mais ser usado para acessar recursos protegidos.
     * Este é o caso mais importante porque garante que o logout realmente funciona
     * como esperado, protegendo o usuário mesmo que alguém tenha uma cópia do seu token.
     */
    it('should logout successfully and revoke token', async () => {
        // Arrange: Criar um usuário e gerar um token válido
        const testUser = await createTestUser({
            email: 'logout@example.com',
            password: 'Test@123456',
        });
        const token = generateTestToken(testUser);

        // Act: Fazer logout usando o token
        const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', createAuthHeader(token))
        .expect(200);

        // Assert: Verificar que recebemos confirmação de logout
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');

        // Assert: Verificar que o token foi adicionado à tabela de tokens revogados
        const revokedToken = await prisma.revokedToken.findUnique({
            where: { token },
        });

        expect(revokedToken).toBeDefined();
        expect(revokedToken?.token).toBe(token);
        expect(revokedToken?.userId).toBe(testUser.id);

        // Assert: Verificar que o token revogado não pode mais ser usado
        // Tentamos acessar um endpoint protegido e devemos receber 401
        const protectedResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', createAuthHeader(token))
        .expect(401);

        expect(protectedResponse.body).toHaveProperty('success', false);
    });

    /**
     * Este teste verifica que logout sem fornecer um token de autenticação é
     * rejeitado apropriadamente. Não faz sentido fazer logout sem estar logado,
     * então a API deve retornar erro 401 indicando que autenticação é necessária.
     */
    it('should return 401 if no token is provided', async () => {
        // Act: Tentar fazer logout sem token
        const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

        // Assert: Verificar erro de autenticação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message.toLowerCase()).toContain('token');
    });

    /**
     * Este teste verifica que tokens inválidos ou malformados são rejeitados.
     * Alguém pode tentar enviar um token adulterado ou simplesmente uma string
     * aleatória, e a aplicação deve detectar isso e rejeitar a requisição.
     */
    it('should return 401 with invalid token', async () => {
        // Act: Tentar fazer logout com token inválido
        const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', createAuthHeader('invalid-token-123'))
        .expect(401);

        // Assert: Verificar erro de autenticação
        expect(response.body).toHaveProperty('success', false);
    });

    /**
     * Este teste verifica que tokens já revogados (de logouts anteriores) são
     * adequadamente rejeitados. Se alguém tentar fazer logout duas vezes com o
     * mesmo token, a segunda tentativa deve falhar porque o token já está na
     * lista negra. Isso previne confusão e garante consistência.
     */
    it('should return 401 if token is already revoked', async () => {
        // Arrange: Criar usuário, gerar token e revogar imediatamente
        const testUser = await createTestUser({
            email: 'revoked@example.com',
            password: 'Test@123456',
        });
        const token = generateTestToken(testUser);

        // Fazer o primeiro logout (que deve funcionar)
        await request(app)
        .post('/api/auth/logout')
        .set('Authorization', createAuthHeader(token))
        .expect(200);

        // Act: Tentar fazer logout novamente com o mesmo token
        const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', createAuthHeader(token))
        .expect(401);

        // Assert: Verificar que recebemos erro apropriado
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message.toLowerCase()).toContain('revoked');
    });

    /**
     * Este teste verifica que tokens expirados não podem ser usados para logout.
     * Embora seja raro alguém tentar fazer logout com um token expirado, precisamos
     * lidar com esse cenário graciosamente retornando um erro apropriado ao invés
     * de permitir a operação ou causar um erro interno do servidor.
     */
    //it('should return 401 with expired token', async () => {
        // Arrange: Criar usuário e gerar token que já está expirado
        //const testUser = await createTestUser({
        //    email: 'expired@example.com',
        //    password: 'Test@123456',
        //});

        // Criar um token manualmente com expiração no passado
        // Nota: Esta é uma simplificação. Na implementação real, você precisaria
        // de uma função helper que cria tokens com expiração customizada para testes
        // const expiredToken = generateTestToken(testUser);

        // Para este teste funcionar completamente, você precisaria criar um token
        // verdadeiramente expirado. Por enquanto, este teste documenta o comportamento
        // esperado mesmo que não seja possível testá-lo completamente sem helpers adicionais.
        
        // O comportamento esperado é que tokens expirados retornem 401
    //});

    /**
     * Este teste verifica que a data de expiração armazenada para o token revogado
     * está correta. Quando revogamos um token, armazenamos sua data de expiração
     * para que possamos eventualmente limpar tokens expirados da tabela de revogados,
     * mantendo a tabela gerenciável mesmo após anos de operação.
     */
    it('should store correct expiration date when revoking token', async () => {
        // Arrange: Criar usuário e token
        const testUser = await createTestUser({
            email: 'expiration@example.com',
            password: 'Test@123456',
        });
        const token = generateTestToken(testUser);

        // Act: Fazer logout
        await request(app)
        .post('/api/auth/logout')
        .set('Authorization', createAuthHeader(token))
        .expect(200);

        // Assert: Verificar que o token revogado tem data de expiração
        const revokedToken = await prisma.revokedToken.findUnique({
            where: { token },
        });

        expect(revokedToken).toBeDefined();
        expect(revokedToken?.expiresAt).toBeInstanceOf(Date);
        
        // A data de expiração deve estar no futuro (token ainda seria válido se não fosse revogado)
        expect(revokedToken!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    /**
     * Este teste verifica que múltiplos tokens do mesmo usuário podem ser revogados
     * independentemente. Um usuário pode estar logado em múltiplos dispositivos
     * (navegador web, app mobile, etc), cada um com seu próprio token. Quando ele
     * faz logout em um dispositivo, apenas aquele token específico deve ser revogado,
     * não afetando os outros dispositivos onde ele ainda está logado.
     */
    it('should allow revoking multiple tokens for same user', async () => {
        // Arrange: Criar usuário e gerar dois tokens diferentes
        const testUser = await createTestUser({
            email: 'multiple@example.com',
            password: 'Test@123456',
        });
        const token1 = generateTestToken(testUser);
        const token2 = generateTestToken(testUser);

        // Act: Fazer logout com o primeiro token
        await request(app)
        .post('/api/auth/logout')
        .set('Authorization', createAuthHeader(token1))
        .expect(200);

        // Assert: Verificar que apenas o primeiro token foi revogado
        const revokedToken1 = await prisma.revokedToken.findUnique({
            where: { token: token1 },
        });

        expect(revokedToken1).toBeDefined();

        // Assert: O segundo token ainda deve funcionar para logout
        const secondLogoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', createAuthHeader(token2))
        .expect(200);

        expect(secondLogoutResponse.body).toHaveProperty('success', true);

        // Assert: Agora ambos os tokens devem estar revogados
        const revokedToken2 = await prisma.revokedToken.findUnique({
            where: { token: token2 },
        });
        expect(revokedToken2).toBeDefined();
    });
});