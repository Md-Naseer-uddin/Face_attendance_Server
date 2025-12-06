import express from 'express';
import cors from 'cors';
import { CONFIG } from './src/config/constants.js';
import routes from './src/routes/index.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import logger from './src/utils/logger.js';

/**
 * Face Attendance System - Server
 * A modern, structured Express.js server for face recognition-based attendance
 */

const app = express();

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parser - Allow larger payloads for embeddings
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req.method, req.path, res.statusCode, duration, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// ==================== ROUTES ====================

// Mount API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Face Attendance System API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      login: 'POST /api/login',
      register: 'POST /api/register',
      markAttendance: 'POST /api/mark-attendance',
      attendance: 'GET /api/attendance',
      people: 'GET /api/people',
      exportAttendance: 'GET /api/export-attendance',
    },
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================== SERVER STARTUP ====================

const server = app.listen(CONFIG.PORT, () => {
  console.log('\n' + '='.repeat(50));
  logger.success(`Face Attendance Server v2.0`);
  logger.success(`Server running on http://localhost:${CONFIG.PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Distance threshold: ${CONFIG.DISTANCE_THRESHOLD}`);
  logger.info(`Liveness threshold: ${CONFIG.LIVENESS_THRESHOLD}`);
  console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.success('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.success('HTTP server closed');
    process.exit(0);
  });
});

export default app;
