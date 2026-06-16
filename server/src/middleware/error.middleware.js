import multer from 'multer';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

/** 404 handler for unmatched routes. */
export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/** Centralised error handler. Must be the last middleware registered. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Translate multer errors into clean API errors.
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const mb = Math.round(config.upload.maxBytes / (1024 * 1024));
      err = ApiError.payloadTooLarge(`File too large. Maximum size is ${mb} MB.`);
    } else {
      err = ApiError.badRequest(`Upload error: ${err.message}`);
    }
  }

  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    error: {
      message: statusCode === 500 ? 'Internal server error.' : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  };

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} →`, err.stack || err.message);
    if (!config.isProd) payload.error.stack = err.stack;
  } else {
    logger.warn(`${req.method} ${req.originalUrl} → ${statusCode}: ${err.message}`);
  }

  res.status(statusCode).json(payload);
}

export default { notFound, errorHandler };
