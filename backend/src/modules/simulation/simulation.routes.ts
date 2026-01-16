import { Router } from 'express';
import { simulationController } from './simulation.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

const router = Router();

// Todas as rotas de simulações requerem autenticação
router.use(authenticate);

// Rotas de utilidade (antes de /:id para evitar conflito)
router.get('/statistics', simulationController.getStatistics.bind(simulationController));
router.get('/accuracy', simulationController.getAccuracy.bind(simulationController));
router.post('/calculate', simulationController.calculateAuto.bind(simulationController));

// Rotas CRUD padrão
router.post('/', simulationController.create.bind(simulationController));
router.get('/', simulationController.findAll.bind(simulationController));
router.get('/:id', simulationController.findById.bind(simulationController));
router.put('/:id', simulationController.update.bind(simulationController));
router.patch('/:id', simulationController.update.bind(simulationController));
router.delete('/:id', simulationController.delete.bind(simulationController));

export default router;