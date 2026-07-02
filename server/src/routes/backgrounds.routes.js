import { Router } from 'express';
import { listBackgrounds } from '../services/backgrounds.service.js';

const router = Router();

router.get('/backgrounds', (req, res) => {
  res.json({ success: true, data: { backgrounds: listBackgrounds() } });
});

export default router;
