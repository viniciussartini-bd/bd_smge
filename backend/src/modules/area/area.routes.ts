import { Router } from 'express';
import { areaController } from './area.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireAdmin } from '../../shared/middlewares/authorization.middleware.js';

const router = Router();

router.post('/', authenticate, requireAdmin, (req, res, next) => areaController.create(req, res, next));
router.get('/', authenticate, (req, res, next) => areaController.findMany(req, res, next));
router.get('/:id', authenticate, (req, res, next) => areaController.findById(req, res, next));
router.put('/:id', authenticate, requireAdmin, (req, res, next) => areaController.update(req, res, next));
router.delete('/:id', authenticate, requireAdmin, (req, res, next) => areaController.delete(req, res, next));

export default router;