import multer from 'multer';
import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * In-memory upload handling. Files never touch disk — we stream the buffers
 * straight into sharp and then OpenAI, which keeps the server stateless.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}. Use JPEG, PNG or WEBP.`));
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxBytes, files: 2 },
});

/**
 * Accept one required "vehicle" image and one optional "background" image.
 */
export const uploadVehicleAndBackground = multerInstance.fields([
  { name: 'vehicle', maxCount: 1 },
  { name: 'background', maxCount: 1 },
]);

/** Single-file uploader for saving a background into the library. */
export const uploadSingleBackground = multerInstance.single('background');

export default uploadVehicleAndBackground;
