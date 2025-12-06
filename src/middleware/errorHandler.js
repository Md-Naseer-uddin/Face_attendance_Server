import { HTTP_STATUS } from '../config/constants.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation error',
      details: err.message,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Unauthorized access',
    });
  }

  // Default error response
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
};
