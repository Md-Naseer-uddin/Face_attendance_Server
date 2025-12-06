import database from '../config/database.js';
import { CONFIG, HTTP_STATUS } from '../config/constants.js';

/**
 * Registration Controller
 * Handles user registration with face embeddings
 */
class RegistrationController {
  /**
   * Register a new user with face embedding
   * POST /api/register
   */
  async register(req, res) {
    try {
      const { userId, name, embedding, email, password, role } = req.body;

      // Validation - Check required fields
      if (!userId || !name || !embedding) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Missing required fields: userId, name, embedding',
        });
      }

      // Validate userId format
      if (typeof userId !== 'string' || userId.trim().length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'User ID must be a non-empty string',
        });
      }

      // Validate name
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Name must be a non-empty string',
        });
      }

      // Validate embedding
      if (!Array.isArray(embedding) || embedding.length !== CONFIG.EMBEDDING_DIMENSIONS) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: `Embedding must be an array of ${CONFIG.EMBEDDING_DIMENSIONS} numbers`,
        });
      }

      // Check if user ID already exists
      const userIdCheck = await database.query(
        'SELECT user_id, name FROM people WHERE user_id = $1',
        [userId]
      );

      if (userIdCheck.rows.length > 0) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: 'User ID already taken',
          existingUser: userIdCheck.rows[0].name,
        });
      }

      // Convert embedding array to pgvector format
      const vectorString = `[${embedding.join(',')}]`;

      // Check if face already exists (find similar faces)
      const faceCheck = await database.query(
        `
        SELECT 
          id,
          user_id,
          name,
          embedding <-> $1::vector AS distance
        FROM people
        ORDER BY distance
        LIMIT 1
      `,
        [vectorString]
      );

      if (
        faceCheck.rows.length > 0 &&
        faceCheck.rows[0].distance < CONFIG.FACE_SIMILARITY_THRESHOLD
      ) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: 'Face already registered',
          existingUser: faceCheck.rows[0].name,
          existingUserId: faceCheck.rows[0].user_id,
          similarity: (1 - faceCheck.rows[0].distance).toFixed(2),
        });
      }

      // Insert new person
      const query = `
        INSERT INTO people (user_id, name, embedding, email, password, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, name, email, role, created_at
      `;

      const result = await database.query(query, [
        userId,
        name,
        vectorString,
        email || null,
        password || null,
        role || 'user',
      ]);

      const person = result.rows[0];

      console.log(`✓ Registered: ${person.name} (${person.user_id}) - Role: ${person.role}`);

      res.json({
        success: true,
        message: 'User registered successfully',
        person: {
          id: person.id,
          userId: person.user_id,
          name: person.name,
          email: person.email,
          role: person.role,
          createdAt: person.created_at,
        },
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Database error during registration',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
}

export default new RegistrationController();
