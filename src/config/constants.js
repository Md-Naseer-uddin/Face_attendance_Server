import dotenv from 'dotenv';

dotenv.config();

/**
 * Application Constants
 */
export const CONFIG = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  
  // Face recognition thresholds
  DISTANCE_THRESHOLD: parseFloat(process.env.DISTANCE_THRESHOLD) || 0.5,
  LIVENESS_THRESHOLD: parseFloat(process.env.LIVENESS_THRESHOLD) || 0.6,
  FACE_SIMILARITY_THRESHOLD: 0.4,
  
  // JWT settings
  JWT_EXPIRY: '24h',
  
  // Embedding dimensions
  EMBEDDING_DIMENSIONS: 128,
};

/**
 * User Roles
 */
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};
