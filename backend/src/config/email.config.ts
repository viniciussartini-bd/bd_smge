import nodemailer from 'nodemailer';
import { env } from './env.config.js';

/**
 * Configuração do transporter de email usando nodemailer.
 * 
 * O transporter é o objeto responsável por enviar emails através do protocolo SMTP.
 * Esta configuração cria uma instância singleton que será reutilizada em toda a
 * aplicação. Reutilizar a mesma instância é importante porque o nodemailer mantém
 * um pool de conexões SMTP, tornando o envio de múltiplos emails muito mais eficiente.
 * 
 * As credenciais e configurações do servidor SMTP são carregadas das variáveis de
 * ambiente, permitindo que você use diferentes provedores de email (Gmail, SendGrid,
 * Amazon SES, etc.) apenas alterando as variáveis de ambiente sem modificar código.
 */
export const emailTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true para 465 (SSL), false para outras portas
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
    /**
     * Configurações adicionais para melhorar a confiabilidade do envio de emails.
     * 
     * - pool: true mantém conexões persistentes com o servidor SMTP, melhorando
     *   performance quando enviamos múltiplos emails em sequência.
     * 
     * - maxConnections: limita o número de conexões simultâneas para não sobrecarregar
     *   o servidor SMTP. Um valor de 5 é adequado para a maioria dos casos.
     * 
     * - maxMessages: define quantos emails podem ser enviados por conexão antes de
     *   fechá-la e abrir uma nova. Isso previne problemas com servidores SMTP que
     *   limitam o número de mensagens por conexão.
     */
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
});

/**
 * Interface que define a estrutura de um email a ser enviado.
 * 
 * Esta interface garante type safety ao enviar emails, prevenindo erros como
 * esquecer de incluir o destinatário ou o assunto. Ela também torna o código
 * mais autodocumentado porque os tipos deixam claro quais campos são necessários.
 */
export interface EmailOptions {
    /**
     * Endereço de email do destinatário
     */
    to: string;

    /**
     * Assunto do email
     */
    subject: string;

    /**
     * Corpo do email em texto puro (fallback para clientes que não suportam HTML)
     */
    text?: string;

    /**
     * Corpo do email em formato HTML (versão rica com formatação)
     */
    html?: string;
}

/**
 * Função auxiliar para enviar emails de forma padronizada.
 * 
 * Esta função encapsula a lógica de envio de email, adicionando tratamento de erros
 * adequado e configurações padrão como o remetente. Centralizar o envio de emails
 * em uma função torna mais fácil adicionar funcionalidades como:
 * - Retry automático em caso de falha
 * - Logging de emails enviados para auditoria
 * - Rate limiting para prevenir spam
 * - Templates de email padronizados
 * 
 * @param options - Opções do email conforme definido na interface EmailOptions
 * @returns Promise que resolve quando o email é enviado com sucesso
 * @throws Error se houver falha no envio do email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
    try {
        const info = await emailTransporter.sendMail({
        from: `"Energy Management System" <${env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        });

        console.info('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
        });
    } catch (error) {
        console.error('❌ Failed to send email:', {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error(`Failed to send email to ${options.to}`);
    }
}

/**
 * Função para verificar a conectividade com o servidor SMTP no startup.
 * 
 * Esta função é chamada quando a aplicação inicia para validar que as credenciais
 * SMTP estão corretas e que o servidor está acessível. Falhar rápido durante o
 * startup é melhor do que descobrir que os emails não estão funcionando quando
 * um usuário tenta recuperar sua senha.
 * 
 * @returns Promise que resolve se a conexão for bem-sucedida
 * @throws Error se não conseguir conectar ao servidor SMTP
 */
export async function verifyEmailConnection(): Promise<void> {
    try {
        await emailTransporter.verify();
        console.info('✅ Email service is ready');
    } catch (error) {
        console.error('❌ Email service verification failed:', error);
        throw new Error('Failed to connect to SMTP server. Please check your email configuration.');
    }
}