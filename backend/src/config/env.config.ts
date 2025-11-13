import { z } from 'zod';
import { DurationString } from '../shared/types/zod.duration';


const duration = z
    .string()
    .regex(/^\d+(ms|s|m|h|d|y)$/)
    .transform((s) => s as DurationString);


/**
 * Schema de validação para variáveis de ambiente.
 * 
 * Este schema usa Zod para definir e validar todas as variáveis de ambiente
 * necessárias para a aplicação funcionar. A validação acontece no startup da
 * aplicação, garantindo que você descubra problemas de configuração imediatamente
 * ao invés de descobrir em runtime quando alguma funcionalidade tentar usar uma
 * variável ausente ou malformada.
 * 
 * Cada campo inclui validações apropriadas para seu tipo. Por exemplo, portas
 * devem ser números inteiros positivos, URLs devem ter formato válido, e emails
 * devem seguir o padrão correto. Esta validação rigorosa previne uma classe
 * inteira de bugs relacionados a configuração incorreta.
 */
const envSchema = z.object({
  // Configurações gerais da aplicação
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),

    // Configurações do banco de dados
    DATABASE_URL: z.url({
        message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    }),

    // Configurações de JWT para autenticação
    JWT_SECRET: z
        .string()
        .min(32, 'JWT_SECRET must be at least 32 characters for security'),
    JWT_EXPIRES_IN: duration.default('7d' as DurationString),
    JWT_EXPIRES_IN_MOBILE: duration.default('365d' as DurationString),

    // Configurações de SMTP para envio de emails
    SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
    SMTP_PORT: z.string().transform(Number).pipe(z.number().positive()),
    SMTP_USER: z.email('SMTP_USER must be a valid email address'),
    SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
});

/**
 * Função que valida e retorna as variáveis de ambiente.
 * 
 * Esta função é executada imediatamente quando o módulo é importado pela primeira
 * vez. Ela tenta fazer o parse das variáveis de ambiente usando o schema definido
 * acima. Se qualquer variável estiver ausente, malformada ou inválida, a função
 * lança um erro detalhado mostrando exatamente qual é o problema, impedindo que
 * a aplicação inicie com configuração incorreta.
 * 
 * O erro é propositalmente fatal porque é melhor a aplicação não iniciar do que
 * iniciar com configuração incorreta e potencialmente causar problemas maiores
 * como perda de dados ou falhas de segurança.
 */
function validateEnv(): z.infer<typeof envSchema> {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
        console.error('❌ Invalid environment variables:');
        error.issues.forEach((err) => {
            console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
        }
        console.error('\n💡 Please check your .env file and ensure all required variables are set correctly.');
        process.exit(1);
    }
}

/**
 * Objeto exportado contendo todas as variáveis de ambiente validadas e tipadas.
 * 
 * Este objeto deve ser importado sempre que você precisar acessar configurações
 * da aplicação. Usar este objeto ao invés de acessar process.env diretamente
 * traz type safety completo, garantindo que você não tente acessar variáveis
 * inexistentes e que você trabalhe com os tipos corretos (números como números,
 * não como strings).
 */
export const env = validateEnv();