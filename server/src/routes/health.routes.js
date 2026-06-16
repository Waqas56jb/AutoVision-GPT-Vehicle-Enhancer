import { Router } from 'express';
import config from '../config/env.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'autovision-server',
      env: config.env,
      model: config.openai.imageModel,
      uptimeSec: Math.round(process.uptime()),
    },
  });
});

export default router;
