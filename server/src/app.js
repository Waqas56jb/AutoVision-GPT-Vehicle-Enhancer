import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import config from './config/env.js';
import logger from './utils/logger.js';
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

  app.use(
    cors({
      origin: (origin, cb) => {
        // No Origin header = same-origin, curl, or a server-to-server call.
        if (!origin) return cb(null, true);
        if (config.clientOrigins.some((o) => o.regex.test(origin))) return cb(null, true);

        /* Hand back `false`, never an Error. An Error here propagates to the
           error handler and answers 500 — which reads as "the backend is
           broken" when the truth is "this origin is not on the list". The
           browser still blocks the response; it just does so cleanly. */
        logger.warn(
          `CORS: blocked origin ${origin} — add it to CLIENT_ORIGIN ` +
            `(currently: ${config.clientOrigins.map((o) => o.pattern).join(', ')})`
        );
        return cb(null, false);
      },
    })
  );

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
