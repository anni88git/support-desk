export class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// 500 fallback via errorHandler (never leak stack traces)
export function errorHandler(err, req, res, next) {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  
  if (statusCode === 500) {
    console.error('[Internal Server Error]', err);
  }

  const payload = {
    error: err.message || 'Internal Server Error'
  };

  if (err.details && Object.keys(err.details).length > 0) {
    payload.details = err.details;
  }

  res.status(statusCode).json(payload);
}
