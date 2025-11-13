import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Middleware do Prisma para logging personalizado de queries lentas.
 * 
 * Este middleware monitora todas as queries executadas e loga aquelas que demoram
 * mais que um threshold definido. Isso é extremamente útil para identificar
 * problemas de performance. Em um sistema que vai crescer com o tempo, queries
 * que são rápidas no início podem se tornar gargalos conforme os dados aumentam.
 * 
 * Com este logging, você pode monitorar proativamente o desempenho e otimizar
 * queries antes que se tornem um problema real para os usuários.
 */

const devLogAsEvents: Prisma.LogDefinition[] = [
    { level: 'query', emit: 'event' }, // para usar prisma.$on('query')
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
];

const prodLogLevels: Prisma.LogLevel[] = ['error'];

export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
    ? devLogAsEvents
    : prodLogLevels,
    errorFormat: 'pretty',
});

/** -------- Extension que mede tempo das queries (equivalente ao middleware) -------- */
const SLOW_QUERY_THRESHOLD_MS = 1000;

const slowQueryExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                const t0 = Date.now();
                const result = await query(args);
                const ms = Date.now() - t0;

                if (ms > SLOW_QUERY_THRESHOLD_MS) {
                    console.warn(`⚠️ Slow query ${model}.${operation} (${ms}ms)`);
                }

                return result;
                },
            },
        },
    });
});

// “Atualiza” o client com a extension
export const prismaExt = prisma.$extends(slowQueryExtension);

/** --------- (Opcional) Logging detalhado por evento: SQL + duração ---------
 * Precisa de log: [{ level: 'query', emit: 'event' }] (já configurado em dev)
 * Docs oficiais: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging
 */
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e: any) => {
        // cuidado: e.params pode conter dados sensíveis
        // console.debug('SQL:', e.query, 'Params:', e.params);
        if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        console.warn(`⚠️ Slow SQL (${e.duration}ms)`);
        }
    });
}

/**
 * Função para conectar ao banco de dados de forma explícita.
 * 
 * Embora o Prisma Client conecte automaticamente na primeira query, ter uma função
 * de conexão explícita é útil para:
 * 1. Validar a conexão no startup da aplicação, falhando rapidamente se houver problemas
 * 2. Implementar lógica de retry caso a conexão inicial falhe
 * 3. Fazer warm-up do pool de conexões antes de começar a receber requisições
 * 
 * Esta função tenta conectar até 5 vezes com intervalos crescentes entre tentativas,
 * o que é especialmente útil em ambientes containerizados onde o banco de dados
 * pode levar alguns segundos para ficar pronto após o container iniciar.
 */
export async function connectDatabase(): Promise<void> {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
        await prisma.$connect();
        console.info('✅ Database connected successfully');
        return;
        } catch (error) {
        retries++;
        console.error(
            `❌ Failed to connect to database (attempt ${retries}/${maxRetries}):`,
            error
        );

        if (retries < maxRetries) {
            const waitTime = retries * 2000;
            console.info(`⏳ Retrying in ${waitTime / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
            console.error('💥 Max retries reached. Could not connect to database.');
            throw error;
        }
        }
    }
}

/**
 * Função para desconectar do banco de dados de forma limpa.
 * 
 * Esta função deve ser chamada quando a aplicação está sendo encerrada (shutdown).
 * Desconectar adequadamente é importante porque garante que todas as queries
 * pendentes sejam completadas e que as conexões sejam liberadas corretamente.
 * 
 * Sem um shutdown apropriado, você pode acabar com conexões órfãs no banco de dados
 * que continuam consumindo recursos mesmo depois da aplicação ter sido encerrada.
 */
export async function disconnectDatabase(): Promise<void> {
    try {
        await prisma.$disconnect();
        console.info('✅ Database disconnected successfully');
    } catch (error) {
        console.error('❌ Error disconnecting from database:', error);
        throw error;
    }
}
