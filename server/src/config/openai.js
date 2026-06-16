import OpenAI from 'openai';
import config from './env.js';

/**
 * Singleton OpenAI client. Imported by services that need image generation.
 */
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export default openai;
