/**
 * Production Logger Utility
 * Provides structured logging with timestamps and levels
 */

const getTimestamp = () => {
  return new Date().toISOString();
};

const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: getTimestamp(),
      message,
      ...meta
    }));
  },

  success: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'SUCCESS',
      timestamp: getTimestamp(),
      message,
      ...meta
    }));
  },

  error: (message, error = null, meta = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: getTimestamp(),
      message,
      error: error ? {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        code: error.code
      } : undefined,
      ...meta
    }));
  },

  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: getTimestamp(),
      message,
      ...meta
    }));
  },

  request: (method, path, statusCode, duration, meta = {}) => {
    console.log(JSON.stringify({
      level: 'REQUEST',
      timestamp: getTimestamp(),
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...meta
    }));
  },

  auth: (action, email, success, meta = {}) => {
    console.log(JSON.stringify({
      level: 'AUTH',
      timestamp: getTimestamp(),
      action,
      email,
      success,
      ...meta
    }));
  },

  database: (operation, success, duration = null, meta = {}) => {
    console.log(JSON.stringify({
      level: 'DATABASE',
      timestamp: getTimestamp(),
      operation,
      success,
      duration: duration ? `${duration}ms` : undefined,
      ...meta
    }));
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({
        level: 'DEBUG',
        timestamp: getTimestamp(),
        message,
        ...meta
      }));
    }
  }
};

export default logger;
