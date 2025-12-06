import jwt from 'jsonwebtoken';
import { CONFIG, ROLES, HTTP_STATUS } from '../config/constants.js';

/**
 * Middleware to verify JWT token
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      error: 'Access token required' 
    });
  }

  jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ 
        error: 'Invalid or expired token' 
      });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      error: 'Authentication required' 
    });
  }

  if (req.user.role !== ROLES.ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ 
      error: 'Admin access required' 
    });
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }

  next();
};
