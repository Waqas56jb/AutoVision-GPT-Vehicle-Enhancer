import { Router } from 'express';
import { uploadVehicleAndBackground } from '../middleware/upload.middleware.js';
import { enhanceRateLimiter } from '../middleware/rateLimit.middleware.js';
import { enhance } from '../controllers/enhance.controller.js';

const router = Router();

router.post('/enhance', enhanceRateLimiter, uploadVehicleAndBackground, enhance);

export default router;
