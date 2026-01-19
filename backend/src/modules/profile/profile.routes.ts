import { Router } from 'express';
import { profileController } from './profile.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

const router = Router();

// Todas as rotas de perfil requerem autenticação
router.use(authenticate);

// Rotas para o próprio perfil (/me)
router.post('/', profileController.create.bind(profileController));
router.get('/me', profileController.getMyProfile.bind(profileController));
router.put('/me', profileController.updateMyProfile.bind(profileController));
router.patch('/me', profileController.updateMyProfile.bind(profileController));
router.delete('/me', profileController.deleteMyProfile.bind(profileController));

// Rotas por ID (requer ser dono ou admin)
router.get('/:id', profileController.findById.bind(profileController));
router.put('/:id', profileController.update.bind(profileController));
router.patch('/:id', profileController.update.bind(profileController));
router.delete('/:id', profileController.delete.bind(profileController));

export default router;