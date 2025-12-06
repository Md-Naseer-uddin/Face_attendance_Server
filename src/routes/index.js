import express from 'express';
import authController from '../controllers/authController.js';
import registrationController from '../controllers/registrationController.js';
import attendanceController from '../controllers/attendanceController.js';
import peopleController from '../controllers/peopleController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Health Check
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Face Attendance System',
  });
});

/**
 * Authentication Routes
 */
router.post('/login', authController.login);
router.get('/verify', authenticateToken, authController.verifyToken);

/**
 * Registration Routes
 * Admin only - only admins can register new users/customers
 */
router.post('/register', authenticateToken, requireAdmin, registrationController.register);

/**
 * Attendance Routes
 * Mark attendance - requires authentication
 * View attendance - admin only
 * Export attendance - admin only
 */
router.post('/mark-attendance', authenticateToken, attendanceController.markAttendance);
router.get('/attendance', authenticateToken, requireAdmin, attendanceController.getAttendance);
router.get('/export-attendance', authenticateToken, requireAdmin, attendanceController.exportAttendance);

/**
 * People Routes
 * All routes require admin access
 */
router.get('/people', authenticateToken, requireAdmin, peopleController.getAllPeople);
router.get('/people/:id', authenticateToken, requireAdmin, peopleController.getPersonById);
router.delete('/people/:id', authenticateToken, requireAdmin, peopleController.deletePerson);

export default router;
