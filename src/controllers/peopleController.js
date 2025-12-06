import database from '../config/database.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * People Controller
 * Handles operations related to registered people
 */
class PeopleController {
  /**
   * Get all registered people
   * GET /api/people
   */
  async getAllPeople(req, res) {
    try {
      const result = await database.query(
        'SELECT id, user_id, name, email, role, created_at FROM people ORDER BY created_at DESC'
      );

      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching people:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Database error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  /**
   * Get a single person by ID
   * GET /api/people/:id
   */
  async getPersonById(req, res) {
    try {
      const { id } = req.params;

      const result = await database.query(
        'SELECT id, user_id, name, email, role, created_at FROM people WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Person not found',
        });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error fetching person:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Database error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  /**
   * Delete a person
   * DELETE /api/people/:id
   */
  async deletePerson(req, res) {
    try {
      const { id } = req.params;

      const result = await database.query(
        'DELETE FROM people WHERE id = $1 RETURNING user_id, name',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Person not found',
        });
      }

      console.log(`✓ Deleted person: ${result.rows[0].name} (${result.rows[0].user_id})`);

      res.json({
        success: true,
        message: 'Person deleted successfully',
        deleted: result.rows[0],
      });
    } catch (err) {
      console.error('Error deleting person:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Database error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
}

export default new PeopleController();
