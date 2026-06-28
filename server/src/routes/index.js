import { Router } from 'express';
import healthRoutes from './health.routes.js';
import enhanceRoutes from './enhance.routes.js';
import recolorRoutes from './recolor.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(enhanceRoutes);
router.use(recolorRoutes);

export default router;
