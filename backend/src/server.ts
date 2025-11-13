import app from './app.js';
import { env } from './config/env.config.js';
import { connectDatabase, disconnectDatabase } from './config/database.config.js';
// import { verifyEmailConnection } from './config/email.config.js';

/**
 * Classe responsável pela inicialização e gerenciamento do ciclo de vida do servidor.
 * 
 * Esta classe cuida de conectar aos serviços externos, iniciar o servidor HTTP,
 * e gerenciar o shutdown gracioso. A separação entre App (configuração) e Server
 * (inicialização) torna o código mais testável e organizado.
 */
class Server {
    private port: number;

    constructor() {
        this.port = env.PORT;
    }

    /**
     * Inicia o servidor e conecta aos serviços externos.
     */
    public async start(): Promise<void> {
        try {
        console.info('🚀 Starting Energy Management System...\n');

        // Conecta ao banco de dados
        console.info('📦 Connecting to database...');
        await connectDatabase();

        /* Verifica conexão com serviço de email
        console.info('📧 Verifying email service...');
        await verifyEmailConnection();*/

        // Inicia o servidor HTTP
        app.listen(this.port, () => {
            console.info(`\n✅ Server is running!`);
            console.info(`📍 Environment: ${env.NODE_ENV}`);
            console.info(`🌐 Server: http://localhost:${this.port}`);
            console.info(`🏥 Health check: http://localhost:${this.port}/health`);
            console.info(`📚 API Root: http://localhost:${this.port}/`);
            console.info(`\n💡 Press CTRL+C to stop\n`);
        });
        } catch (error) {
            console.error('💥 Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Para o servidor gracefully.
     */
    public async stop(): Promise<void> {
        try {
            console.info('\n🛑 Shutting down gracefully...');
            await disconnectDatabase();
            console.info('✅ Server stopped successfully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Cria e inicia o servidor
const server = new Server();
server.start();

// Handlers para shutdown gracioso
process.on('SIGTERM', () => server.stop());
process.on('SIGINT', () => server.stop());

// Handler para erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    server.stop();
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    server.stop();
});