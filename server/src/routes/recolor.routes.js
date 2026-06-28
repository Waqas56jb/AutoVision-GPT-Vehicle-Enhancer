import { Router } from 'express';
import { uploadVehicleAndBackground } from '../middleware/upload.middleware.js';
import { enhanceRateLimiter } from '../middleware/rateLimit.middleware.js';
import { recolor } from '../controllers/recolor.controller.js';

const router = Router();

// Reuses the same upload middleware (only the "vehicle" field is required here).
router.post('/recolor', enhanceRateLimiter, uploadVehicleAndBackground, recolor);

export default router;
