import database from '../config/database.js';
import { CONFIG, HTTP_STATUS } from '../config/constants.js';

/**
 * Attendance Controller
 * Handles attendance marking and retrieval
 */
class AttendanceController {
  /**
   * Mark attendance with face matching and liveness check
   * POST /api/mark-attendance
   */
  async markAttendance(req, res) {
    try {
      const { embedding, livenessScore } = req.body;

      // Validation
      if (!embedding || !Array.isArray(embedding) || embedding.length !== CONFIG.EMBEDDING_DIMENSIONS) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          error: 'Invalid embedding format' 
        });
      }

      if (
        typeof livenessScore !== 'number' ||
        livenessScore < 0 ||
        livenessScore > 1
      ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          error: 'Liveness score must be between 0 and 1' 
        });
      }

      // Check liveness threshold
      if (livenessScore < CONFIG.LIVENESS_THRESHOLD) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Liveness check failed',
          livenessScore,
          threshold: CONFIG.LIVENESS_THRESHOLD,
        });
      }

      const vectorString = `[${embedding.join(',')}]`;

      // Find nearest neighbor using pgvector
      const query = `
        SELECT 
          id,
          user_id,
          name,
          embedding <-> $1::vector AS distance
        FROM people
        ORDER BY distance
        LIMIT 1
      `;

      const result = await database.query(query, [vectorString]);

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'No registered users found',
        });
      }

      const match = result.rows[0];

      // Check if distance is within acceptable threshold
      if (match.distance > CONFIG.DISTANCE_THRESHOLD) {
        // Log failed attempt
        await database.query(
          'INSERT INTO attendance (user_id, matched_person_id, confidence, liveness_score) VALUES ($1, $2, $3, $4)',
          ['unknown', null, match.distance, livenessScore]
        );

        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'No matching user found',
          distance: match.distance,
          threshold: CONFIG.DISTANCE_THRESHOLD,
        });
      }

      // Success! Log attendance
      await database.query(
        'INSERT INTO attendance (user_id, matched_person_id, confidence, liveness_score) VALUES ($1, $2, $3, $4)',
        [match.user_id, match.id, match.distance, livenessScore]
      );

      console.log(
        `✓ Attendance: ${match.name} (distance: ${match.distance.toFixed(3)}, liveness: ${livenessScore.toFixed(2)})`
      );

      res.json({
        success: true,
        userId: match.user_id,
        name: match.name,
        distance: match.distance,
        confidence: 1 - match.distance / CONFIG.DISTANCE_THRESHOLD,
        livenessScore,
      });
    } catch (err) {
      console.error('Attendance error:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Database error during attendance check',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  /**
   * Get all attendance records
   * GET /api/attendance
   */
  async getAttendance(req, res) {
    try {
      const result = await database.query(`
        SELECT 
          a.id,
          a.user_id,
          a.matched_person_id,
          a.confidence,
          a.liveness_score,
          a.created_at,
          p.name as matched_name
        FROM attendance a
        LEFT JOIN people p ON a.matched_person_id = p.id
        ORDER BY a.created_at DESC
        LIMIT 100
      `);

      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Database error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  /**
   * Export attendance records with date filtering
   * GET /api/export-attendance
   */
  async exportAttendance(req, res) {
    try {
      const { startDate, endDate } = req.query;

      let query = `
        SELECT 
          a.id,
          a.user_id,
          p.name as matched_name,
          a.created_at
        FROM attendance a
        LEFT JOIN people p ON a.matched_person_id = p.id
        WHERE a.matched_person_id IS NOT NULL
      `;

      const params = [];

      if (startDate) {
        params.push(startDate + ' 00:00:00');
        query += ` AND a.created_at >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate + ' 23:59:59');
        query += ` AND a.created_at <= $${params.length}`;
      }

      query += ' ORDER BY a.created_at DESC';

      const result = await database.query(query, params);

      console.log(`✓ Exported ${result.rows.length} attendance records`);

      res.json(result.rows);
    } catch (err) {
      console.error('Error exporting attendance:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Database error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
}

export default new AttendanceController();
