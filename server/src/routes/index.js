import { Router } from 'express';
import healthRoutes from './health.routes.js';
import enhanceRoutes from './enhance.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(enhanceRoutes);

export default router;
