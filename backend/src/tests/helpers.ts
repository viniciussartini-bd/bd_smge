import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.config.js';
import { generateToken } from '../shared/utils/jwt.utils.js';

/**
 * Interface que define os dados de um usuário de teste.
 * Ter esta interface torna o código mais type-safe e autodocumentado.
 */
export interface TestUser {
    id: string;
    email: string;
    password: string;
    name: string;
    role: string;
}

/**
 * Cria um usuário no banco de dados de teste.
 * 
 * Esta função é uma ferramenta essencial para os testes porque muitas
 * funcionalidades requerem que exista um usuário no sistema. Ao invés de
 * duplicar o código de criação de usuário em cada teste, centralizamos
 * essa lógica aqui. A função aceita dados parciais, preenchendo valores
 * padrão sensatos para qualquer campo que não for especificado, tornando
 * os testes mais concisos.
 * 
 * É importante notar que a senha é hasheada aqui da mesma forma que seria
 * na aplicação real, garantindo que os testes reflitam com precisão o
 * comportamento em produção.
 * 
 * @param data - Dados parciais do usuário, campos não especificados usarão valores padrão
 * @returns O usuário criado com todos os seus dados
 */
export async function createTestUser(
    data: Partial<TestUser> = {}
): Promise<TestUser> {
    const defaultData = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test@123456',
        name: 'Test User',
        role: 'USER',
    };

    const userData = { ...defaultData, ...data };
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.create({
        data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role as any,
        },
    });

    return {
        id: user.id,
        email: user.email,
        password: userData.password,
        name: user.name,
        role: user.role,
    };
}

/**
 * Cria um usuário administrador no banco de dados de teste.
 * 
 * Esta é uma função de conveniência que simplifica a criação de usuários
 * admin nos testes. Muitos testes precisam verificar comportamentos que são
 * exclusivos de administradores, então ter uma função dedicada para criar
 * admins torna esses testes mais limpos e legíveis.
 * 
 * @param data - Dados parciais do admin, campos não especificados usarão valores padrão
 * @returns O usuário admin criado
 */
export async function createTestAdmin(
    data: Partial<TestUser> = {}
): Promise<TestUser> {
    return createTestUser({
        ...data,
        role: 'ADMIN',
        email: data.email || `admin-${Date.now()}@example.com`,
        name: data.name || 'Test Admin',
    });
}

/**
 * Gera um token JWT válido para um usuário de teste.
 * 
 * Esta função é extremamente útil para testar endpoints protegidos. Ao invés
 * de ter que fazer login através da API em cada teste que precisa de autenticação,
 * você pode simplesmente gerar um token diretamente. Isso torna os testes mais
 * rápidos e focados, testando apenas a funcionalidade específica que você quer
 * verificar, não o sistema de autenticação inteiro.
 * 
 * O token gerado é idêntico ao que seria gerado durante um login real, garantindo
 * que os testes sejam representativos do comportamento real da aplicação.
 * 
 * @param user - O usuário para o qual gerar o token
 * @param isMobile - Se deve gerar um token mobile (com maior tempo de expiração)
 * @returns Um token JWT válido para o usuário
 */
export function generateTestToken(
    user: TestUser,
    isMobile: boolean = false
): string {
    return generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        isMobile,
    });
}

/**
 * Cria um header de autorização no formato esperado pela API.
 * 
 * Esta função formata um token JWT no padrão Bearer que a API espera receber
 * no header Authorization. Usar esta função garante consistência nos testes
 * e torna o código mais legível, deixando claro que você está criando um
 * header de autorização e não apenas concatenando strings.
 * 
 * @param token - O token JWT
 * @returns String no formato "Bearer <token>" pronta para usar no header
 */
export function createAuthHeader(token: string): string {
    return `Bearer ${token}`;
}

/**
 * Limpa completamente o banco de dados de teste.
 * 
 * Esta função pode ser útil em alguns cenários específicos de teste onde você
 * quer garantir um estado completamente limpo. Embora o beforeEach no setup.ts
 * já limpe o banco antes de cada teste, às vezes você pode querer limpar
 * manualmente no meio de um teste ou fazer uma limpeza adicional após operações
 * complexas.
 * 
 * A ordem de deleção respeita as foreign keys, deletando primeiro as tabelas
 * que dependem de outras e por último as tabelas base.
 */
export async function cleanDatabase(): Promise<void> {
    await prisma.revokedToken.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.consumptionLog.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.simulation.deleteMany();
    await prisma.device.deleteMany();
    await prisma.area.deleteMany();
    await prisma.plant.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.energyCompany.deleteMany();
}