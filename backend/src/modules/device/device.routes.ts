import { Router } from 'express';
import { deviceController } from './device.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireAdmin } from '../../shared/middlewares/authorization.middleware.js';

const router = Router();

// Todas as rotas de dispositivos requerem autenticação
router.use(authenticate);

// Rotas que qualquer usuário autenticado pode acessar
router.get('/', deviceController.findAll.bind(deviceController));
router.get('/:id', deviceController.findById.bind(deviceController));
router.get('/:id/estimated-consumption', deviceController.getEstimatedConsumption.bind(deviceController));

// Rotas que apenas administradores podem acessar
router.post('/', requireAdmin, deviceController.create.bind(deviceController));
router.put('/:id', requireAdmin, deviceController.update.bind(deviceController));
router.patch('/:id', requireAdmin, deviceController.update.bind(deviceController));
router.patch('/:id/connection-status', requireAdmin, deviceController.updateConnectionStatus.bind(deviceController));
router.delete('/:id', requireAdmin, deviceController.delete.bind(deviceController));

export default router;