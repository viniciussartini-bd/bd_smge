import { Router } from 'express';
import { plantController } from './plant.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireAdmin } from '../../shared/middlewares/authorization.middleware.js';

const router = Router();

// Todas as rotas de plantas requerem autenticação
router.use(authenticate);

// Rotas que qualquer usuário autenticado pode acessar
router.get('/', plantController.findAll.bind(plantController));
router.get('/:id', plantController.findById.bind(plantController));

// Rotas que apenas administradores podem acessar
router.post('/', requireAdmin, plantController.create.bind(plantController));
router.put('/:id', requireAdmin, plantController.update.bind(plantController));
router.patch('/:id', requireAdmin, plantController.update.bind(plantController));
router.delete('/:id', requireAdmin, plantController.delete.bind(plantController));

export default router;