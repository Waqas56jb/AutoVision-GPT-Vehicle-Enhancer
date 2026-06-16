/**
 * Wraps an async Express handler so rejected promises are forwarded to
 * the centralised error middleware instead of crashing the process.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
