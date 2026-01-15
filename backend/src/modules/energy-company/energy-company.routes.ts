import { Router } from 'express';
import { energyCompanyController } from './energy-company.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireAdmin } from '../../shared/middlewares/authorization.middleware.js';

const router = Router();

// Todas as rotas de companhias de energia requerem autenticação
router.use(authenticate);

// Rotas que qualquer usuário autenticado pode acessar
router.get('/', energyCompanyController.findAll.bind(energyCompanyController));
router.get('/:id', energyCompanyController.findById.bind(energyCompanyController));
router.get('/:id/calculate-cost', energyCompanyController.calculateCost.bind(energyCompanyController));
router.get('/:id/peak-time', energyCompanyController.checkPeakTime.bind(energyCompanyController));
router.get('/:id/estimate-monthly', energyCompanyController.estimateMonthlyCost.bind(energyCompanyController));

// Rotas que apenas administradores podem acessar
router.post('/', requireAdmin, energyCompanyController.create.bind(energyCompanyController));
router.put('/:id', requireAdmin, energyCompanyController.update.bind(energyCompanyController));
router.patch('/:id', requireAdmin, energyCompanyController.update.bind(energyCompanyController));
router.delete('/:id', requireAdmin, energyCompanyController.delete.bind(energyCompanyController));

export default router;