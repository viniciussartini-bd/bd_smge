import express, { Express } from 'express';
import cors from 'cors';
import path from "node:path";
import favicon from "serve-favicon";
import { env } from './config/env.config.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import plantRoutes from './modules/plant/plant.routes.js';
import areaRoutes from './modules/area/area.routes.js';
import deviceRoutes from './modules/device/device.routes.js';
import consumptionLogRoutes from './modules/consumption-log/consumption-log.routes.js';
import energyCompanyRoutes from './modules/energy-company/energy-company.routes.js';
import alertRoutes from './modules/alert/alert.routes.js';
import simulationRoutes from './modules/simulation/simulation.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';

class App {
    public express: Express;

    constructor() {
        this.express = express();
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandlers();
    }

    private setupMiddlewares(): void {
        this.express.use(cors({
            origin: '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }));

        this.express.use(express.json({ limit: '10mb' }));
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(favicon(path.join(process.cwd(), 'public', 'favicon.ico')));
        this.express.use(express.static(path.join(process.cwd(), 'public')));

        this.express.use((req, _res, next) => {
            console.info(`${req.method} ${req.path} - ${new Date().toISOString()}`);
            next();
        });
    }

    private setupRoutes(): void {
        this.express.get('/health', (_req, res) => {
            res.json({
                success: true,
                message: 'Server is running',
                timestamp: new Date().toISOString(),
                environment: env.NODE_ENV,
            });
        });

        this.express.get('/', (_req, res) => {
            res.json({
                success: true,
                message: 'Energy Management System API',
                version: '1.0.0',
                documentation: '/api/docs',
            });
        });

        this.express.use('/api/auth', authRoutes);
        this.express.use('/api/profile', profileRoutes);
        this.express.use('/api/plants', plantRoutes);
        this.express.use('/api/areas', areaRoutes);
        this.express.use('/api/devices', deviceRoutes);
        this.express.use('/api/consumption-logs', consumptionLogRoutes);
        this.express.use('/api/energy-companies', energyCompanyRoutes);
        this.express.use('/api/alerts', alertRoutes);
        this.express.use('/api/simulations', simulationRoutes);
    }

    private setupErrorHandlers(): void {
        this.express.use(notFoundHandler);
        this.express.use(errorHandler);
    }
}

export default new App().express;