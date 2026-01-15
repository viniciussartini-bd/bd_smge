import { Router } from 'express';
import { consumptionLogController } from './consumption-log.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireAdmin } from '../../shared/middlewares/authorization.middleware.js';

const router = Router();

// Todas as rotas de logs de consumo requerem autenticação
router.use(authenticate);

// Rotas que qualquer usuário autenticado pode acessar
router.get('/', consumptionLogController.findAll.bind(consumptionLogController));
router.get('/stats', consumptionLogController.getConsumptionStats.bind(consumptionLogController));
router.get('/analysis', consumptionLogController.getConsumptionAnalysis.bind(consumptionLogController));
router.get('/compare', consumptionLogController.compareConsumption.bind(consumptionLogController));
router.get('/device/:deviceId/latest', consumptionLogController.getLatestReading.bind(consumptionLogController));
router.get('/device/:deviceId/anomalies', consumptionLogController.detectAnomalies.bind(consumptionLogController));
router.get('/device/:deviceId/projection', consumptionLogController.projectConsumption.bind(consumptionLogController));
router.get('/:id', consumptionLogController.findById.bind(consumptionLogController));

// Rotas que apenas administradores podem acessar
router.post('/', requireAdmin, consumptionLogController.create.bind(consumptionLogController));
router.put('/:id', requireAdmin, consumptionLogController.update.bind(consumptionLogController));
router.patch('/:id', requireAdmin, consumptionLogController.update.bind(consumptionLogController));
router.delete('/:id', requireAdmin, consumptionLogController.delete.bind(consumptionLogController));

export default router;