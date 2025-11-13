import { defineConfig } from 'vitest/config';

/**
 * Configuração do Vitest para testes.
 * 
 * Esta configuração prepara o ambiente de testes para trabalhar com TypeScript,
 * ESM e Node.js de forma otimizada. Cada opção aqui foi cuidadosamente escolhida
 * para proporcionar a melhor experiência de desenvolvimento possível enquanto
 * garante que os testes sejam executados de forma confiável e rápida.
 */
export default defineConfig({
    test: {
        /**
         * Globals permite usar funções como describe, it, expect sem importá-las
         * explicitamente em cada arquivo de teste. Isso torna os testes mais limpos
         * e é o comportamento padrão que a maioria dos desenvolvedores espera vindos
         * de frameworks como Jest.
         */
        globals: true,

        /**
         * Environment define o ambiente onde os testes rodam. 'node' significa que
         * os testes rodarão em um ambiente Node.js puro, não em um browser simulado.
         * Isso é apropriado porque estamos testando uma API backend, não código
         * que roda no navegador.
         */
        environment: 'node',

        /**
         * setupFiles especifica arquivos que devem ser executados antes de cada
         * suite de testes. Usaremos isso para configurar o banco de dados de teste,
         * limpar dados entre testes, e outras tarefas de setup.
         */
        setupFiles: ['./src/tests/setup.ts'],

        /**
         * Pool e poolOptions controlam como os testes são executados.
         * Usamos 'forks' ao invés de 'threads' porque nossos testes interagem com
         * banco de dados e precisam de isolamento completo. Cada suite de testes
         * rodará em seu próprio processo Node.js separado.
         */
        pool: 'threads',
//        poolOptions: {
//            forks: {
                /**
                 * singleFork: true força todos os testes a rodarem sequencialmente em
                 * um único processo. Isso é importante porque nossos testes compartilham
                 * o mesmo banco de dados, e execução paralela poderia causar condições
                 * de corrida onde um teste interfere com outro.
                 */
//                singleFork: true,
//            },
//        },

        /**
         * Coverage configura como os relatórios de cobertura de código são gerados.
         * Estes relatórios mostram quais partes do código estão sendo testadas e
         * quais não estão, ajudando você a identificar gaps na cobertura de testes.
         */
        coverage: {
            /**
             * Provider 'v8' usa o coverage nativo do V8 (engine JavaScript do Node.js),
             * que é mais rápido e preciso que alternativas baseadas em instrumentação
             * de código.
             */
            provider: 'v8',

            /**
             * Reporter define os formatos de relatório gerados. 'text' mostra um resumo
             * no terminal, 'json' gera dados estruturados para ferramentas de CI/CD,
             * 'html' cria um relatório visual navegável no browser, e 'lcov' é um
             * formato padrão usado por muitas ferramentas de análise de código.
             */
            reporter: ['text', 'json', 'html', 'lcov'],

            /**
             * Exclude lista pastas e arquivos que não devem ser incluídos no relatório
             * de cobertura. Não faz sentido medir cobertura de testes, configurações,
             * ou arquivos de build, então excluímos essas áreas.
             */
            exclude: [
                'node_modules/**',
                'src/tests/**',
                '**/*.config.ts',
                '**/*.d.ts',
                'dist/**',
                'coverage/**',
            ],

            /**
             * Thresholds definem os níveis mínimos aceitáveis de cobertura de código.
             * Se a cobertura cair abaixo destes valores, os testes falharão. Isso
             * garante que o projeto mantenha um padrão alto de qualidade ao longo
             * do tempo. Os valores de 80% são considerados bons para projetos
             * profissionais, indicando que a maior parte do código está testada.
             */
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80,
            },
        },

        /**
         * TestTimeout define quanto tempo um teste pode rodar antes de ser
         * considerado travado e ser abortado. 10 segundos é generoso o suficiente
         * para testes que fazem operações de I/O como consultas ao banco de dados,
         * mas curto o suficiente para detectar testes problemáticos rapidamente.
         */
        testTimeout: 10000,

        /**
         * Silent suprime logs de console durante os testes quando definido como true.
         * Mantemos como false para poder ver mensagens importantes durante o
         * desenvolvimento dos testes.
         */
        silent: false,
    },
});