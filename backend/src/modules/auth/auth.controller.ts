import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validators.js';
import { ValidationError } from '../../shared/errors/app-errors.js';
import { extractTokenFromHeader } from '../../shared/utils/jwt.utils.js';

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = registerSchema.parse(req.body);
            const result = await authService.register(validatedData);

            res.status(201).json({ success: true, message: 'User registered successfully', data: result });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = loginSchema.parse(req.body);
            const result = await authService.login(validatedData);

            res.status(200).json({ success: true, message: 'Login successful', data: result });
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = extractTokenFromHeader(req.headers.authorization);

            if (!token) {
                throw new ValidationError('No token provided');
            }

            await authService.logout(token);

            res.status(200).json({ success: true, message: 'Logout successful' });
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = forgotPasswordSchema.parse(req.body);
            await authService.forgotPassword(validatedData.email);

            res.status(200).json({ success: true, message: 'If the email exists in our system, you will receive password reset instructions' });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = resetPasswordSchema.parse(req.body);
            await authService.resetPassword(validatedData.token, validatedData.newPassword);
            
            res.status(200).json({ success: true, message: 'Password reset successful. You can now login with your new password' });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();