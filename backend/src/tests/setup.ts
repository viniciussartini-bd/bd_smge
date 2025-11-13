import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../config/database.config.js';

/**
 * Setup global para todos os testes.
 * 
 * Este arquivo é executado antes de qualquer teste rodar. Sua responsabilidade
 * principal é garantir que o ambiente de testes esteja limpo e consistente,
 * permitindo que cada teste rode em isolamento sem interferir nos outros.
 * 
 * A estratégia aqui é usar o mesmo banco de dados para todos os testes, mas
 * limpar todos os dados entre cada teste. Isso garante que cada teste comece
 * com um estado conhecido e previsível, eliminando bugs difíceis de reproduzir
 * causados por testes que dependem do estado deixado por testes anteriores.
 */

/**
 * beforeAll roda uma vez antes de todos os testes da suite começarem.
 * Usamos isso para garantir que o banco de dados está conectado e pronto.
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

/**
 * afterAll roda uma vez depois que todos os testes terminaram.
 * Usamos isso para desconectar do banco de dados de forma limpa,
 * liberando recursos e garantindo que o processo de teste possa
 * encerrar graciosamente.
 */
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
 * Esta função é crucial para isolar testes uns dos outros. Ela limpa
 * completamente o banco de dados antes de cada teste, garantindo que
 * nenhum teste seja afetado pelos dados deixados por testes anteriores.
 * 
 * A ordem de deleção é importante por causa das foreign keys. Começamos
 * deletando dados de tabelas que dependem de outras (como revokedTokens
 * que depende de users) e vamos subindo a hierarquia até chegar nas
 * tabelas base que não dependem de ninguém.
 */
beforeEach(async () => {
  // Limpa todas as tabelas na ordem correta para respeitar foreign keys
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
});