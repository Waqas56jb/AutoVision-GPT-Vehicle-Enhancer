/**
 * Vercel serverless entry point.
 *
 * Vercel's @vercel/node runtime treats a default-exported Express app as the
 * request handler. We DO NOT call app.listen() here — Vercel owns the server
 * lifecycle. Local development still uses src/index.js (which calls listen()).
 *
 * The accompanying vercel.json rewrites every path to this function, so the
 * Express router (mounted at /api) keeps working unchanged.
 */
import { createApp } from '../src/app.js';

const app = createApp();

export default app;
