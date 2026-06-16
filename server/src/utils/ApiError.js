/**
 * Operational error with an attached HTTP status code.
 * Thrown anywhere in the request lifecycle and handled by error.middleware.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static payloadTooLarge(message) {
    return new ApiError(413, message);
  }

  static tooManyRequests(message) {
    return new ApiError(429, message);
  }

  static upstream(message, details) {
    return new ApiError(502, message, details);
  }
}

export default ApiError;
