import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { uploadSingleBackground } from '../middleware/upload.middleware.js';
import {
  listBackgrounds,
  saveBackground,
  deleteBackground,
} from '../services/backgrounds.service.js';

const router = Router();

// List all saved backgrounds.
router.get('/backgrounds', (req, res) => {
  res.json({ success: true, data: { backgrounds: listBackgrounds() } });
});

// Upload & save a new background into the library.
router.post(
  '/backgrounds',
  uploadSingleBackground,
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('A "background" image file is required.');
    const background = await saveBackground(req.file.buffer, req.file.originalname);
    res.status(201).json({ success: true, data: { background } });
  })
);

// Delete a saved background by id.
router.delete(
  '/backgrounds/:id',
  asyncHandler(async (req, res) => {
    const ok = deleteBackground(req.params.id);
    if (!ok) throw ApiError.badRequest('Background not found.');
    res.json({ success: true, data: { deleted: req.params.id } });
  })
);

export default router;
