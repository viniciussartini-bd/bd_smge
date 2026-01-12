import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { createTestUser, createTestAdmin } from '../helpers.js';

/**
 * Suite de testes para a funcionalidade de login de usuários.
 * 
 * O login é uma das funcionalidades mais críticas de qualquer aplicação porque
 * é o portão de entrada para todas as operações autenticadas. Precisamos garantir
 * que ele funcione perfeitamente quando as credenciais estão corretas, mas também
 * que rejeite adequadamente tentativas de login inválidas sem dar pistas sobre
 * quais contas existem no sistema (para prevenir enumeração de usuários).
 */
describe('POST /api/auth/login', () => {
    /**
     * Este é o teste mais importante da suite de login, verificando que um usuário
     * com credenciais válidas consegue fazer login com sucesso. Não apenas verificamos
     * o código de status, mas também que recebemos um token JWT válido e todas as
     * informações do usuário necessárias para o frontend funcionar corretamente.
     */
    it('should login successfully with valid credentials', async () => {
        // Arrange: Criar um usuário de teste no banco de dados
        const testUser = await createTestUser({
            email: 'login@example.com',
            password: 'Test@123456',
            name: 'Login Test User',
        });

        // Act: Fazer a requisição de login com credenciais corretas
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: testUser.email,
            password: testUser.password,
        })
        .expect(200);

        // Assert: Verificar a estrutura completa da resposta
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('expiresAt');

        // Assert: Verificar que os dados do usuário estão corretos
        expect(response.body.data.user).toMatchObject({
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
            role: testUser.role,
        });

        // Assert: Verificar que a senha não está exposta na resposta
        expect(response.body.data.user).not.toHaveProperty('password');

        // Assert: Verificar que o token JWT foi gerado
        expect(typeof response.body.data.token).toBe('string');
        expect(response.body.data.token.length).toBeGreaterThan(0);

        // Assert: Verificar que expiresAt é uma data válida
        expect(new Date(response.body.data.expiresAt).toString()).not.toBe('Invalid Date');
    });

    /**
     * Este teste verifica um cenário de segurança importante: tentativas de login
     * com senha incorreta devem ser rejeitadas. A mensagem de erro deve ser genérica
     * o suficiente para não revelar se o email existe ou não, prevenindo ataques de
     * enumeração de usuários onde um atacante tenta descobrir quais emails estão
     * cadastrados no sistema.
     */
    it('should return 401 with incorrect password', async () => {
        // Arrange: Criar um usuário com senha conhecida
        const testUser = await createTestUser({
            email: 'password@example.com',
            password: 'Test@123456',
        });

        // Act: Tentar fazer login com senha errada
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: testUser.email,
            password: 'WrongPassword@123',
        })
        .expect(401);

        // Assert: Verificar que recebemos erro de autenticação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message.toLowerCase()).toContain('invalid');

        // Assert: Verificar que não recebemos um token
        expect(response.body).not.toHaveProperty('token');
    });

    /**
     * Este teste verifica que tentativas de login com email inexistente também são
     * rejeitadas com a mesma mensagem de erro que senha incorreta. Isso previne que
     * atacantes descubram quais emails estão cadastrados no sistema testando diferentes
     * emails e observando as mensagens de erro diferentes.
     */
    it('should return 401 with non-existent email', async () => {
        // Act: Tentar fazer login com email que não existe
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'nonexistent@example.com',
            password: 'Test@123456',
        })
        .expect(401);

        // Assert: Verificar que recebemos erro de autenticação genérico
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message.toLowerCase()).toContain('invalid');
    });

    /**
     * Este teste verifica que o login funciona independentemente da capitalização
     * do email. Como normalizamos emails para lowercase no registro, precisamos
     * garantir que o login também aceite emails em qualquer capitalização.
     */
    it('should login successfully with email in different case', async () => {
        // Arrange: Criar usuário com email em lowercase
        const testUser = await createTestUser({
            email: 'case@example.com',
            password: 'Test@123456',
        });

        // Act: Fazer login com email em uppercase
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'CASE@EXAMPLE.COM',
            password: testUser.password,
        })
        .expect(200);

        // Assert: Verificar que o login foi bem-sucedido
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.user.email).toBe('case@example.com');
    });

    /**
     * Este teste verifica a validação de dados no login. Mesmo que um frontend bem
     * feito valide os dados antes de enviar, nunca podemos confiar apenas em validação
     * client-side porque ela pode ser contornada. O backend deve sempre validar.
     */
    it('should return 400 with invalid email format', async () => {
        // Act: Tentar fazer login com email malformado
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'not-an-email',
            password: 'Test@123456',
        })
        .expect(400);

        // Assert: Verificar que recebemos erro de validação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });

    /**
     * Este teste verifica que campos obrigatórios não podem estar ausentes.
     * A API deve retornar erros claros sobre quais dados estão faltando.
     */
    it('should return 400 if required fields are missing', async () => {
        // Act: Tentar fazer login sem senha
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'test@example.com',
        })
        .expect(400);

        // Assert: Verificar erro de validação
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('validation');
    });

    /**
     * Este teste verifica a funcionalidade de tokens mobile. Quando um usuário
     * faz login de um aplicativo mobile, ele deve receber um token com tempo de
     * expiração muito maior, permitindo que ele permaneça logado por longos períodos.
     */
    it('should generate mobile token when isMobile is true', async () => {
        // Arrange: Criar usuário de teste
        const testUser = await createTestUser({
            email: 'mobile@example.com',
            password: 'Test@123456',
        });

        // Act: Fazer login indicando que é mobile
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: testUser.email,
            password: testUser.password,
            isMobile: true,
        })
        .expect(200);

        // Assert: Verificar que recebemos um token
        expect(response.body.data).toHaveProperty('token');
        expect(typeof response.body.data.token).toBe('string');

        // Assert: Verificar que a data de expiração está no futuro distante
        const expiresAt = new Date(response.body.data.expiresAt);
        const now = new Date();
        const daysDifference = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        // Token mobile deve expirar em pelo menos 300 dias (configurado como 365 dias)
        expect(daysDifference).toBeGreaterThan(300);
    });

    /**
     * Este teste verifica que administradores conseguem fazer login normalmente
     * e que seu role é corretamente retornado na resposta. Isso é importante porque
     * o frontend precisa saber se o usuário é admin para mostrar funcionalidades
     * administrativas.
     */
    it('should login admin user successfully', async () => {
        // Arrange: Criar um usuário admin
        const adminUser = await createTestAdmin({
            email: 'admin@example.com',
            password: 'Admin@123456',
        });

        // Act: Fazer login como admin
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: adminUser.email,
            password: adminUser.password,
        })
        .expect(200);

        // Assert: Verificar que o role retornado é ADMIN
        expect(response.body.data.user.role).toBe('ADMIN');
    });

    /**
     * Este teste verifica que espaços em branco no email são tratados corretamente.
     * Usuários frequentemente copiam e colam emails com espaços acidentais, e a
     * aplicação deve lidar com isso graciosamente ao invés de rejeitar o login.
     */
    it('should trim whitespace from email', async () => {
        // Arrange: Criar usuário
        const testUser = await createTestUser({
            email: 'trim@example.com',
            password: 'Test@123456',
        });

        // Act: Fazer login com espaços no início e fim do email
        const response = await request(app)
        .post('/api/auth/login')
        .send({
            email: '  trim@example.com  ',
            password: testUser.password,
        })
        .expect(200);

        // Assert: Verificar que o login foi bem-sucedido
        expect(response.body).toHaveProperty('success', true);
    });
});