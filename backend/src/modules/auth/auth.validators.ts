import { z } from 'zod';

/**
 * Schema de validação para registro de novos usuários.
 * 
 * Este schema define as regras de validação para quando um usuário se cadastra
 * no sistema. Cada campo tem validações específicas que garantem a qualidade
 * e segurança dos dados. As mensagens de erro são cuidadosamente escritas para
 * serem claras e acionáveis, dizendo ao usuário exatamente o que está errado
 * e como corrigir.
 */
export const registerSchema = z.object({
    /**
     * Email deve ser um endereço de email válido. O Zod verifica automaticamente
     * o formato usando uma regex padrão que cobre a vasta maioria dos emails válidos.
     */
    email: z.email({error: 'Please provide a valid email address'})
        .toLowerCase()
        .trim(),

    /**
     * Senha tem requisitos de segurança rigorosos. Mínimo de 8 caracteres é
     * geralmente considerado o padrão mínimo aceitável, e exigir pelo menos uma
     * letra maiúscula, uma minúscula, um número e um caractere especial garante
     * que a senha seja razoavelmente forte contra ataques de força bruta.
     */
    password: z.string()
        .min(8, {error: 'Password must be at least 8 characters long'})
        .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),

    /**
     * Nome do usuário para personalização. Exigimos pelo menos 2 caracteres
     * para evitar nomes muito curtos ou vazios, e limitamos a 100 caracteres
     * para prevenir abuse ou problemas de display.
     */
    name: z.string()
        .min(2, {error: 'Name must be at least 2 characters long'})
        .max(100, {error: 'Name must not exceed 100 characters'})
        .trim(),
});

/**
 * Schema de validação para login de usuários.
 * 
 * Login é mais simples que registro porque só precisa validar as credenciais
 * existentes, não criar novas com requisitos de segurança. No entanto, ainda
 * validamos o formato para prevenir tentativas de injection ou outros ataques.
 */
export const loginSchema = z.object({
    /**
     * Email para identificação do usuário.
     */
    email: z.email({error: 'Please provide a valid email address'})
        .toLowerCase()
        .trim(),

    /**
     * Senha fornecida pelo usuário. Não validamos os requisitos de complexidade
     * aqui porque estamos verificando uma senha existente, não criando uma nova.
     * A senha pode ter sido criada com requisitos diferentes.
     */
    password: z.string()
        .min(1, {error: 'Password cannot be empty'}),

    /**
     * Flag opcional indicando se este é um login de aplicação mobile.
     * Login mobile recebe tokens com tempo de expiração muito maior porque
     * aplicativos mobile geralmente mantêm usuários logados por longos períodos.
     */
    isMobile: z.boolean().optional().default(false),
});

/**
 * Schema de validação para solicitação de recuperação de senha.
 * 
 * Este schema valida quando um usuário esqueceu sua senha e está solicitando
 * um email de recuperação. Só precisamos do email porque é assim que
 * identificaremos para qual usuário enviar o link de recuperação.
 */
export const forgotPasswordSchema = z.object({
    /**
     * Email do usuário que esqueceu a senha.
     */
    email: z.email({error: 'Please provide a valid email address'})
        .toLowerCase()
        .trim(),
});

/**
 * Schema de validação para redefinição de senha.
 * 
 * Este schema valida quando um usuário clicou no link de recuperação e está
 * definindo uma nova senha. Precisamos do token (que veio no link do email)
 * e da nova senha que o usuário escolheu.
 */
export const resetPasswordSchema = z.object({
    /**
     * Token de recuperação que foi enviado por email. Este token é único e
     * tem prazo de validade, garantindo que links de recuperação não possam
     * ser usados indefinidamente.
     */
    token: z
        .string()
        .min(1, {error: 'Reset token cannot be empty'}),

    /**
     * Nova senha escolhida pelo usuário. Aplicamos os mesmos requisitos de
     * segurança que usamos no registro para garantir que a nova senha seja forte.
     */
    newPassword: z.string()
        .min(8, {error: 'Password must be at least 8 characters long'})
        .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
});

/**
 * Tipos TypeScript inferidos dos schemas Zod.
 * 
 * Uma das features mais poderosas do Zod é a capacidade de inferir tipos
 * TypeScript diretamente dos schemas de validação. Isso significa que você
 * define as regras de validação uma vez, e automaticamente obtém tipos
 * TypeScript que refletem exatamente essas regras. Isso elimina duplicação
 * e garante que seus tipos sempre estarão sincronizados com suas validações.
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;