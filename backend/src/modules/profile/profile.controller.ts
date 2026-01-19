import { Request, Response, NextFunction } from 'express';
import { profileService } from './profile.service.js';
import { createProfileSchema, updateProfileSchema } from './profile.validators.js';

/**
 * Controller responsável por gerenciar as requisições HTTP relacionadas a perfis de usuário.
 * 
 * Este controller atua como camada de interface entre as requisições HTTP e a lógica
 * de negócio, validando entradas e formatando respostas.
 */
export class ProfileController {
    /**
     * Cria um novo perfil para o usuário autenticado.
     * POST /api/profile
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = createProfileSchema.parse(req.body);
            const userId = (req as any).user.id;

            const profile = await profileService.create(validatedData, userId);

            res.status(201).json({
                success: true,
                message: 'Profile created successfully',
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca o perfil do usuário autenticado.
     * GET /api/profile/me
     */
    async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const includeUser = req.query.include === 'user';

            const profile = await profileService.getMyProfile(userId, includeUser);

            res.status(200).json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualiza o perfil do usuário autenticado.
     * PUT/PATCH /api/profile/me
     */
    async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = updateProfileSchema.parse(req.body);
            const userId = (req as any).user.id;

            const profile = await profileService.updateMyProfile(userId, validatedData);

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deleta o perfil do usuário autenticado.
     * DELETE /api/profile/me
     */
    async deleteMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.id;

            await profileService.deleteMyProfile(userId);

            res.status(200).json({
                success: true,
                message: 'Profile deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca um perfil por ID.
     * GET /api/profile/:id
     * 
     * Requer: ser dono do perfil ou admin
     */
    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;
            const includeUser = req.query.include === 'user';

            const profile = await profileService.findById(id, userId, userRole, includeUser);

            res.status(200).json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualiza um perfil por ID.
     * PUT/PATCH /api/profile/:id
     * 
     * Requer: ser dono do perfil ou admin
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const validatedData = updateProfileSchema.parse(req.body);
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;

            const profile = await profileService.update(id, validatedData, userId, userRole);

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deleta um perfil por ID.
     * DELETE /api/profile/:id
     * 
     * Requer: ser dono do perfil ou admin
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;

            await profileService.delete(id, userId, userRole);

            res.status(200).json({
                success: true,
                message: 'Profile deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const profileController = new ProfileController();