import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import config from './config/env.js';
import apiRoutes from './routes/index.js';
import { BACKGROUNDS_DIR } from './services/backgrounds.service.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

/**
 * Builds and configures the Express application (no listening here, so the
 * app stays testable and the entry point owns the lifecycle).
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Behind Vercel / a reverse proxy: trust the first proxy hop so the client's
  // real IP (X-Forwarded-For) is used for rate limiting and logging.
  if (config.isProd) app.set('trust proxy', 1);

  // Security headers. crossOriginResourcePolicy relaxed so image data URLs work cross-origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  /**
   * Public CORS: any origin may call this API from a browser.
   *
   * This means the frontend needs zero backend configuration — deploy it
   * anywhere (Vercel production, a preview URL, a custom domain, localhost) and
   * it just works, with no CLIENT_ORIGIN to keep in sync.
   *
   * The trade-off is deliberate: an open origin lets any web page spend this
   * account's OpenAI credits from a visitor's browser. Note that CORS was never
   * really the defence here — it only restricts *browsers*, and anyone could
   * always curl these endpoints directly. The controls that actually matter are
   * the per-IP rate limiter on /api/enhance and /api/recolor, and the upload
   * size cap. If this ever needs locking down, add an API key rather than
   * reinstating an origin allow-list.
   *
   * `credentials` stays off — a wildcard origin and cookies cannot coexist, and
   * this API is stateless anyway.
   */
  app.use(cors({ origin: '*', credentials: false }));

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (!config.isProd) app.use(morgan('dev'));

  // Serve preset background thumbnails/files statically.
  app.use('/backgrounds', express.static(BACKGROUNDS_DIR, { maxAge: '1h' }));

  // API
  app.use('/api', apiRoutes);

  // Root
  app.get('/', (req, res) => {
    res.json({ success: true, data: { service: 'AutoVision GPT API', docs: '/api/health' } });
  });

  // Errors (order matters: 404 then handler)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
