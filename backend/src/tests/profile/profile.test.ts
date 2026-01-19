import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/database.config.js';
import { createTestUser, createTestAdmin, generateTestToken, createAuthHeader } from '../helpers.js';

// CNPJs válidos para uso nos testes
const VALID_CNPJS = {
    CNPJ_1: '11222333000181',
    CNPJ_2: '11222333000262', // CNPJ válido diferente
    CNPJ_3: '11222333000343', // CNPJ válido diferente
    CNPJ_4: '11222333000424', // CNPJ válido diferente
    CNPJ_INVALID: '11111111111111', // CNPJ inválido para testes de validação
};

describe('POST /api/profile', () => {
    it('should create profile successfully', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const response = await request(app)
            .post('/api/profile')
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Minha Empresa LTDA',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste, 123',
                city: 'São Paulo',
                state: 'SP',
                phone: '(11) 98765-4321',
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.fantasyName).toBe('Minha Empresa LTDA');
        expect(response.body.data.cnpj).toBe(VALID_CNPJS.CNPJ_1);
        expect(response.body.data.userId).toBe(user.id);
    });

    it('should return 409 if user already has profile', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        // Criar perfil primeiro
        await prisma.profile.create({
            data: {
                fantasyName: 'Empresa Existente',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        // Tentar criar outro perfil
        await request(app)
            .post('/api/profile')
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Segunda Empresa',
                cnpj: VALID_CNPJS.CNPJ_2,
                zipCode: '87654321',
                address: 'Outra Rua',
                city: 'Rio',
                state: 'RJ',
            })
            .expect(409);
    });

    it('should return 409 if CNPJ already exists', async () => {
        const user1 = await createTestUser({ email: 'user1@test.com' });
        const user2 = await createTestUser({ email: 'user2@test.com' });
        const token2 = generateTestToken(user2);

        // Usuário 1 cria perfil
        await prisma.profile.create({
            data: {
                fantasyName: 'Empresa User1',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user1.id,
            },
        });

        // Usuário 2 tenta usar mesmo CNPJ
        await request(app)
            .post('/api/profile')
            .set('Authorization', createAuthHeader(token2))
            .send({
                fantasyName: 'Empresa User2',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '87654321',
                address: 'Outra Rua',
                city: 'Rio',
                state: 'RJ',
            })
            .expect(409);
    });

    it('should return 400 with invalid CNPJ', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .post('/api/profile')
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Empresa Teste',
                cnpj: VALID_CNPJS.CNPJ_INVALID,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
            })
            .expect(400);
    });

    it('should return 400 with invalid zip code', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .post('/api/profile')
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Empresa Teste',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '123', // CEP inválido
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
            })
            .expect(400);
    });

    it('should create profile without phone', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const response = await request(app)
            .post('/api/profile')
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Empresa Sem Telefone',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
            })
            .expect(201);

        expect(response.body.data.phone).toBeNull();
    });

    it('should return 401 without authentication', async () => {
        await request(app)
            .post('/api/profile')
            .send({
                fantasyName: 'Empresa Teste',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
            })
            .expect(401);
    });
});

describe('GET /api/profile/me', () => {
    it('should get own profile', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await prisma.profile.create({
            data: {
                fantasyName: 'Minha Empresa',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .get('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.fantasyName).toBe('Minha Empresa');
        expect(response.body.data.userId).toBe(user.id);
    });

    it('should return 404 if profile does not exist', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });

    it('should include user data when requested', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await prisma.profile.create({
            data: {
                fantasyName: 'Minha Empresa',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .get('/api/profile/me?include=user')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.email).toBe(user.email);
    });
});

describe('GET /api/profile/:id', () => {
    it('should get own profile by id', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Minha Empresa',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .get(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        expect(response.body.data.id).toBe(profile.id);
    });

    it('should return 403 when accessing other user profile', async () => {
        const user1 = await createTestUser({ email: 'user1@test.com' });
        const user2 = await createTestUser({ email: 'user2@test.com' });
        const token2 = generateTestToken(user2);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa User1',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user1.id,
            },
        });

        await request(app)
            .get(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(token2))
            .expect(403);
    });

    it('should allow admin to access any profile', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const adminToken = generateTestToken(admin);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa User',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .get(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(adminToken))
            .expect(200);

        expect(response.body.data.id).toBe(profile.id);
    });

    it('should return 404 for non-existent profile', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .get('/api/profile/00000000-0000-0000-0000-000000000000')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });
});

describe('PUT /api/profile/me', () => {
    it('should update own profile', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await prisma.profile.create({
            data: {
                fantasyName: 'Empresa Original',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Original',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .put('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Empresa Atualizada',
                address: 'Rua Nova, 456',
                phone: '(11) 91234-5678',
            })
            .expect(200);

        expect(response.body.data.fantasyName).toBe('Empresa Atualizada');
        expect(response.body.data.address).toBe('Rua Nova, 456');
        expect(response.body.data.phone).toBe('(11) 91234-5678');
        expect(response.body.data.cnpj).toBe(VALID_CNPJS.CNPJ_1); // CNPJ não muda
    });

    it('should allow partial update', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await prisma.profile.create({
            data: {
                fantasyName: 'Empresa Original',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Original',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .patch('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .send({
                city: 'Rio de Janeiro',
                state: 'RJ',
            })
            .expect(200);

        expect(response.body.data.city).toBe('Rio de Janeiro');
        expect(response.body.data.state).toBe('RJ');
        expect(response.body.data.fantasyName).toBe('Empresa Original'); // Não mudou
    });

    it('should return 404 if profile does not exist', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .put('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Nova Empresa',
            })
            .expect(404);
    });
});

describe('PUT /api/profile/:id', () => {
    it('should update own profile by id', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa Original',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Original',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .put(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(token))
            .send({
                fantasyName: 'Empresa Atualizada',
            })
            .expect(200);

        expect(response.body.data.fantasyName).toBe('Empresa Atualizada');
    });

    it('should return 403 when updating other user profile', async () => {
        const user1 = await createTestUser({ email: 'user1@test.com' });
        const user2 = await createTestUser({ email: 'user2@test.com' });
        const token2 = generateTestToken(user2);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa User1',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user1.id,
            },
        });

        await request(app)
            .put(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(token2))
            .send({
                fantasyName: 'Tentativa de Atualização',
            })
            .expect(403);
    });

    it('should allow admin to update any profile', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const adminToken = generateTestToken(admin);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa User',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        const response = await request(app)
            .put(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(adminToken))
            .send({
                fantasyName: 'Atualizado pelo Admin',
            })
            .expect(200);

        expect(response.body.data.fantasyName).toBe('Atualizado pelo Admin');
    });
});

describe('DELETE /api/profile/me', () => {
    it('should delete own profile', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa Para Deletar',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        await request(app)
            .delete('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.profile.findUnique({ where: { id: profile.id } });
        expect(deleted).toBeNull();
    });

    it('should return 404 if profile does not exist', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await request(app)
            .delete('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .expect(404);
    });
});

describe('DELETE /api/profile/:id', () => {
    it('should delete own profile by id', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa Para Deletar',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        await request(app)
            .delete(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(token))
            .expect(200);

        const deleted = await prisma.profile.findUnique({ where: { id: profile.id } });
        expect(deleted).toBeNull();
    });

    it('should return 403 when deleting other user profile', async () => {
        const user1 = await createTestUser({ email: 'user1@test.com' });
        const user2 = await createTestUser({ email: 'user2@test.com' });
        const token2 = generateTestToken(user2);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa User1',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user1.id,
            },
        });

        await request(app)
            .delete(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(token2))
            .expect(403);
    });

    it('should allow admin to delete any profile', async () => {
        const user = await createTestUser();
        const admin = await createTestAdmin();
        const adminToken = generateTestToken(admin);

        const profile = await prisma.profile.create({
            data: {
                fantasyName: 'Empresa User',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Teste',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        await request(app)
            .delete(`/api/profile/${profile.id}`)
            .set('Authorization', createAuthHeader(adminToken))
            .expect(200);

        const deleted = await prisma.profile.findUnique({ where: { id: profile.id } });
        expect(deleted).toBeNull();
    });
});

describe('Security', () => {
    it('should require authentication for all routes', async () => {
        await request(app).get('/api/profile/me').expect(401);
        await request(app).put('/api/profile/me').expect(401);
        await request(app).delete('/api/profile/me').expect(401);
    });

    it('should not allow CNPJ update', async () => {
        const user = await createTestUser();
        const token = generateTestToken(user);

        await prisma.profile.create({
            data: {
                fantasyName: 'Empresa Original',
                cnpj: VALID_CNPJS.CNPJ_1,
                zipCode: '12345678',
                address: 'Rua Original',
                city: 'São Paulo',
                state: 'SP',
                userId: user.id,
            },
        });

        // O schema de update não permite alterar CNPJ
        const response = await request(app)
            .put('/api/profile/me')
            .set('Authorization', createAuthHeader(token))
            .send({
                cnpj: '99999999999999', // Tentar mudar CNPJ
                fantasyName: 'Empresa Atualizada',
            })
            .expect(200);

        // CNPJ não deve ter mudado
        expect(response.body.data.cnpj).toBe(VALID_CNPJS.CNPJ_1);
    });
});