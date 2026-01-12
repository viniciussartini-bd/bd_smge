import { z } from 'zod';

export const registerSchema = z.object({
    email: z.email('Please provide a valid email address').toLowerCase().trim(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
    name: z.string()
        .min(2, 'Name must be at least 2 characters long')
        .max(100, 'Name must not exceed 100 characters')
        .trim(),
});

export const loginSchema = z.object({
    email: z.email('Please provide a valid email address').toLowerCase().trim(),
    password: z.string().min(1, 'Password cannot be empty'),
    isMobile: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
    email: z.email('Please provide a valid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token cannot be empty'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;