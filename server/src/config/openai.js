import { File as BufferFile } from 'node:buffer';
import OpenAI from 'openai';
import config from './env.js';

/**
 * Safety net for the OpenAI SDK's file uploads.
 *
 * openai v6's toFile() needs a global `File`, which only exists from Node 20.
 * The `engines` field and .nvmrc pin Node 20 on the host, but if this ever runs
 * somewhere older, this makes the failure loud and self-healing instead of a
 * 500 on every single request ("`File` is not defined as a global"). node:buffer
 * exports File on Node 20+, so on a correctly-pinned host this is a harmless
 * no-op; on Node 18 it at least surfaces the real cause.
 */
if (typeof globalThis.File === 'undefined' && BufferFile) {
  globalThis.File = BufferFile;
}

/**
 * Singleton OpenAI client. Imported by services that need image generation.
 *
 * Concurrency note: this client is safe to use from many in-flight requests at
 * once — each images.edit() call is an independent HTTPS request and Node never
 * blocks waiting on one. A batch of N vehicles really does fan out to N
 * simultaneous calls; the ceiling is the account's images-per-minute quota, not
 * this process.
 *
 * maxRetries lets the SDK absorb OpenAI's own 429s with exponential backoff
 * before the error ever reaches our controller. The default (2) is too shallow
 * for a large batch, where a burst of rate limits is expected and normal.
 */
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  maxRetries: config.openai.maxRetries,
  timeout: config.openai.timeoutMs,
});

export default openai;
