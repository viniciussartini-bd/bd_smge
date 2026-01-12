import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../config/database.config.js';

/**
 * Setup global para todos os testes.
 * 
 * Este arquivo é executado antes de qualquer teste rodar. Sua responsabilidade
 * principal é garantir que o ambiente de testes esteja limpo e consistente,
 * permitindo que cada teste rode em isolamento sem interferir nos outros.
 * 
 * IMPORTANTE: A ordem de limpeza das tabelas é crucial devido às foreign keys.
 * Devemos deletar primeiro as tabelas que dependem de outras (tabelas filhas),
 * e por último as tabelas base (tabelas pais).
 */

beforeAll(async () => {
    console.log('🧪 Setting up test environment...');
    
    try {
        await prisma.$connect();
        console.log('✅ Test database connected');
    } catch (error) {
        console.error('❌ Failed to connect to test database:', error);
        throw error;
    }
});

afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
    
    try {
        await prisma.$disconnect();
        console.log('✅ Test database disconnected');
    } catch (error) {
        console.error('❌ Failed to disconnect from test database:', error);
        throw error;
    }
});

/**
 * beforeEach roda antes de cada teste individual.
 * 
 * ORDEM CRÍTICA DE DELEÇÃO:
 * 
 * A ordem abaixo respeita rigorosamente as foreign keys do schema Prisma.
 * Começamos deletando as tabelas que estão no "topo" da hierarquia de dependências
 * e vamos descendo até as tabelas base.
 * 
 * Hierarquia de dependências (do mais dependente ao menos dependente):
 * 
 * Level 4 (folhas - não têm nada que depende delas):
 *   - ConsumptionLog (depende de: User, Device)
 * 
 * Level 3:
 *   - Alert (depende de: User, Plant, Area, Device)
 *   - Simulation (depende de: User, Plant, Area, Device)
 *   - Device (depende de: Area)
 *   - RevokedToken (depende de: User)
 *   - PasswordReset (depende de: User)
 * 
 * Level 2:
 *   - Area (depende de: Plant)
 *   - Profile (depende de: User)
 * 
 * Level 1:
 *   - Plant (depende de: User, EnergyCompany) ⚠️ CRITICAL: onDelete: Restrict para User!
 * 
 * Level 0 (base - outras tabelas dependem delas):
 *   - User (muitas tabelas dependem!)
 *   - EnergyCompany (Plant depende)
 */
beforeEach(async () => {
    try {
        // Level 4: Deletar primeiro as tabelas que não têm dependentes
        await prisma.consumptionLog.deleteMany();

        // Level 3: Deletar tabelas que dependem de Area, Device, Plant
        await prisma.alert.deleteMany();
        await prisma.simulation.deleteMany();
        await prisma.device.deleteMany();
        
        // Deletar tokens relacionados a User (mas não impedem deleção de User)
        await prisma.revokedToken.deleteMany();
        await prisma.passwordReset.deleteMany();

        // Level 2: Deletar tabelas que dependem diretamente de Plant ou User
        await prisma.area.deleteMany();
        await prisma.profile.deleteMany();

        // Level 1: CRÍTICO - Deletar plantas ANTES de usuários!
        // Esta é a chave para resolver o problema. Plant tem onDelete: Restrict
        // para User, então DEVE ser deletada antes dos usuários.
        await prisma.plant.deleteMany();

        // Level 0: Deletar tabelas base por último
        await prisma.user.deleteMany();
        await prisma.energyCompany.deleteMany();
        
    } catch (error) {
        console.error('❌ Error cleaning database:', error);
        throw error;
    }
});