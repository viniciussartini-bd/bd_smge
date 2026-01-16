import { Router } from 'express';
import { alertController } from './alert.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireAdmin } from '../../shared/middlewares/authorization.middleware.js';

const router = Router();

// Todas as rotas de alertas requerem autenticação
router.use(authenticate);

// Rota de estatísticas deve vir antes de /:id para evitar conflito
router.get('/statistics', alertController.getStatistics.bind(alertController));

// Rota para marcar todos como lidos
router.post('/mark-all-read', alertController.markAllAsRead.bind(alertController));

// Rotas que qualquer usuário autenticado pode acessar (seus próprios alertas)
router.get('/', alertController.findAll.bind(alertController));
router.get('/:id', alertController.findById.bind(alertController));
router.patch('/:id/read', alertController.markAsRead.bind(alertController));

// Rotas que apenas administradores podem acessar
router.post('/', requireAdmin, alertController.create.bind(alertController));
router.put('/:id', requireAdmin, alertController.update.bind(alertController));
router.patch('/:id', requireAdmin, alertController.update.bind(alertController));
router.delete('/:id', requireAdmin, alertController.delete.bind(alertController));

export default router;