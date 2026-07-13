import OpenAI from 'openai';
import config from './env.js';

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
