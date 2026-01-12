import { defineConfig } from 'vitest/config';

/**
 * Configuração do Vitest para testes de integração.
 * 
 * Esta configuração foi ajustada especificamente para testes de integração
 * que compartilham um banco de dados real. A chave aqui é desabilitar a
 * execução paralela de testes para evitar condições de corrida.
 * 
 * IMPORTANTE: Estamos usando configurações que funcionam na versão 4.0.8 do Vitest.
 * As configurações são mais simples mas igualmente efetivas.
 */
export default defineConfig({
    test: {
        /**
         * Globals permite usar funções como describe, it, expect sem importá-las.
         */
        globals: true,

        /**
         * Environment 'node' é apropriado para testes de backend/API.
         */
        environment: 'node',

        /**
         * setupFiles executam antes de cada suite de testes.
         */
        setupFiles: ['./src/tests/setup.ts'],

        /**
         * CRÍTICO: pool define como os testes são executados.
         * 
         * Usando 'threads' com configurações específicas que forçam execução sequencial.
         * Na versão 4.0.8, esta é a forma mais confiável de desabilitar paralelismo.
         */
        pool: 'threads',

        /**
         * CHAVE PARA RESOLVER O PROBLEMA:
         * 
         * maxConcurrency: 1 força apenas 1 teste a rodar por vez.
         * Isso efetivamente desabilita todo paralelismo.
         * 
         * Mesmo que o Vitest tente criar múltiplas threads, apenas 1 teste
         * será executado de cada vez, eliminando condições de corrida.
         */
        maxConcurrency: 1,

        /**
         * fileParallelism controla se múltiplos arquivos de teste rodam em paralelo.
         * false = um arquivo de teste por vez (sequencial).
         */
        fileParallelism: false,

        /**
         * isolate garante que cada arquivo de teste rode em um contexto isolado.
         * Isso ajuda a prevenir vazamento de estado entre arquivos de teste.
         */
        isolate: true,

        /**
         * Configuração de cobertura de código.
         */
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/**',
                'src/tests/**',
                '**/*.config.ts',
                '**/*.d.ts',
                'dist/**',
                'coverage/**',
            ],
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80,
            },
        },

        /**
         * Timeout generoso porque testes de integração fazem I/O real.
         */
        testTimeout: 10000,

        /**
         * Silent false para ver mensagens importantes durante os testes.
         */
        silent: false,
    },
});