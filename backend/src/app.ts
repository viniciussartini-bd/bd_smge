import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env.config.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler.middleware.js';

/**
 * Classe que encapsula a configuração da aplicação Express.
 * 
 * Esta classe é responsável apenas pela configuração do Express e seus middlewares.
 * A lógica de inicialização e conexão com serviços externos fica em server.ts.
 * Esta separação facilita testes e torna o código mais modular.
 */
class App {
    public express: Express;

    constructor() {
        this.express = express();
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandlers();
    }

    /**
     * Configura os middlewares globais da aplicação.
     */
    private setupMiddlewares(): void {
        // CORS
        this.express.use(
            cors({
                origin: '*',
                /*origin: env.NODE_ENV === 'development'
                ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
                : ['https://seu-dominio.com'],*/
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                allowedHeaders: ['Content-Type', 'Authorization'],
            })
        );

        // Body parsers
        this.express.use(express.json({ limit: '10mb' }));
        this.express.use(express.urlencoded({ extended: true }));

        // Logging simples de requisições
        this.express.use((req, _res, next) => {
            console.info(`${req.method} ${req.path} - ${new Date().toISOString()}`);
            next();
        });
    }

    /**
     * Configura as rotas da aplicação.
     */
    private setupRoutes(): void {
        // Rota de health check
        this.express.get('/health', (_req, res) => {
            res.json({
                success: true,
                message: 'Server is running',
                timestamp: new Date().toISOString(),
                environment: env.NODE_ENV,
            });
        });

        // Rota raiz
        this.express.get('/', (_req, res) => {
            res.json({
                success: true,
                message: 'Energy Management System API',
                version: '1.0.0',
                documentation: '/api/docs',
            });
        });

        // Aqui adicionaremos as rotas dos módulos conforme formos desenvolvendo
        // Exemplo:
        // this.express.use('/api/auth', authRoutes);
        // this.express.use('/api/plants', plantRoutes);
        // this.express.use('/api/areas', areaRoutes);
    }

    /**
     * Configura os handlers de erro.
     */
    private setupErrorHandlers(): void {
        this.express.use(notFoundHandler);
        this.express.use(errorHandler);
    }
}

export default new App().express;