import jwt from 'jsonwebtoken';
import database from '../config/database.js';
import { CONFIG, HTTP_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Authentication Controller
 * Handles user login and authentication
 */
class AuthController {
  /**
   * Login with email and password
   * POST /api/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          error: 'Email and password are required' 
        });
      }

      // Query user from database
      const result = await database.query(
        'SELECT id, user_id, name, email, password, role FROM people WHERE email = $1',
        [email]
      );

      // Check if user exists
      if (result.rows.length === 0) {
        logger.auth('login_attempt', email, false, { reason: 'user_not_found' });
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          error: 'Invalid email or password' 
        });
      }

      const user = result.rows[0];

      // Verify password (in production, use bcrypt for hashed passwords)
      if (password !== user.password) {
        logger.auth('login_attempt', email, false, { reason: 'invalid_password' });
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id,
          email: user.email, 
          role: user.role,
          userId: user.user_id,
        },
        CONFIG.JWT_SECRET,
        { expiresIn: CONFIG.JWT_EXPIRY }
      );

      logger.auth('login_success', email, true, { 
        role: user.role,
        userId: user.user_id 
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          userId: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      logger.error('Login error', err, { email });
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Login failed',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  /**
   * Verify token validity
   * GET /api/verify
   */
  async verifyToken(req, res) {
    // If we reach here, token is valid (checked by authenticateToken middleware)
    return res.json({
      success: true,
      user: req.user,
    });
  }
}

export default new AuthController();
