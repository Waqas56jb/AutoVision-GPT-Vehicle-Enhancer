import config from './config/env.js';
import { createApp } from './app.js';
import logger from './utils/logger.js';

/**
 * Application entry point. Validates config (via env.js import), then starts
 * the HTTP server with graceful shutdown.
 */
function start() {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.success(`AutoVision API listening on http://localhost:${config.port} [${config.env}]`);
    logger.info(`Image model: ${config.openai.imageModel} | size: ${config.openai.imageSize} | quality: ${config.openai.imageQuality}`);
    logger.info(`Allowed client origins: ${config.clientOrigins.join(', ')}`);
  });

  const shutdown = (signal) => {
    logger.warn(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed. Bye.');
      process.exit(0);
    });
    // Force-exit if connections hang.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason);
  });
}

try {
  start();
} catch (err) {
  logger.error('Failed to start server:', err.message);
  process.exit(1);
}
