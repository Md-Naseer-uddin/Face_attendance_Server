import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
console.log("Database url: ",process.env.DATABASE_URL);
// Database connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  console.log('✓ Database connected successfully');
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for embeddings
// app.use(createTables); // Ensure tables exist

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== LOGIN ENDPOINT ====================

/**
 * POST /api/login
 * Login with hardcoded credentials (no DB)
 * Body: { email, password }
 */
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Hardcoded credentials
  const ADMIN_EMAIL = 'admin@mail.com';
  const ADMIN_PASSWORD = 'admin@123';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Generate JWT token
    const token = jwt.sign(
      { email: ADMIN_EMAIL, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✓ Login successful: ${email}`);

    return res.json({
      success: true,
      token,
      user: { email: ADMIN_EMAIL, role: 'admin' }
    });
  } else {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== REGISTRATION ENDPOINT ====================

/**
 * POST /api/register
 * Register a new user with face embedding
 * Body: { userId, name, embedding: Float32Array }
 */
app.post('/api/register', async (req, res) => {
  const { userId, name, embedding } = req.body;

  // Validation - Check required fields
  if (!userId || !name || !embedding) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: userId, name, embedding' 
    });
  }

  // Validate userId format (alphanumeric, no spaces)
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'User ID must be a non-empty string' 
    });
  }

  // Validate name
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Name must be a non-empty string' 
    });
  }

  // Validate embedding
  if (!Array.isArray(embedding) || embedding.length !== 128) {
    return res.status(400).json({ 
      success: false,
      error: 'Embedding must be an array of 128 numbers' 
    });
  }

  try {
    // Check if user ID already exists
    const userIdCheck = await pool.query(
      'SELECT user_id, name FROM people WHERE user_id = $1',
      [userId]
    );

    if (userIdCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'User ID already taken',
        existingUser: userIdCheck.rows[0].name
      });
    }

    // Convert embedding array to pgvector format: '[x1,x2,x3,...]'
    const vectorString = `[${embedding.join(',')}]`;

    // Check if face already exists (find similar faces)
    const FACE_SIMILARITY_THRESHOLD = 0.4; // Lower distance = more similar
    const faceCheck = await pool.query(`
      SELECT 
        id,
        user_id,
        name,
        embedding <-> $1::vector AS distance
      FROM people
      ORDER BY distance
      LIMIT 1
    `, [vectorString]);

    if (faceCheck.rows.length > 0 && faceCheck.rows[0].distance < FACE_SIMILARITY_THRESHOLD) {
      return res.status(409).json({ 
        success: false,
        error: 'Face already registered',
        existingUser: faceCheck.rows[0].name,
        existingUserId: faceCheck.rows[0].user_id,
        similarity: (1 - faceCheck.rows[0].distance).toFixed(2)
      });
    }

    // Insert new person
    const query = `
      INSERT INTO people (user_id, name, embedding)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, name, created_at
    `;

    const result = await pool.query(query, [userId, name, vectorString]);
    const person = result.rows[0];

    console.log(`✓ Registered: ${person.name} (${person.user_id})`);

    res.json({
      success: true,
      message: 'User registered successfully',
      person: {
        id: person.id,
        userId: person.user_id,
        name: person.name,
        createdAt: person.created_at
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Database error during registration' 
    });
  }
});

// ==================== ATTENDANCE ENDPOINT ====================

/**
 * POST /api/mark-attendance
 * Mark attendance with face matching and liveness check
 * Body: { embedding: Float32Array, livenessScore: number }
 */
app.post('/api/mark-attendance', async (req, res) => {
  const { embedding, livenessScore } = req.body;

  // Validation
  if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
    return res.status(400).json({ error: 'Invalid embedding format' });
  }

  if (typeof livenessScore !== 'number' || livenessScore < 0 || livenessScore > 1) {
    return res.status(400).json({ error: 'Liveness score must be between 0 and 1' });
  }

  // Check liveness threshold
  const LIVENESS_THRESHOLD = parseFloat(process.env.LIVENESS_THRESHOLD) || 0.6;
  if (livenessScore < LIVENESS_THRESHOLD) {
    return res.status(403).json({ 
      success: false,
      error: 'Liveness check failed',
      livenessScore,
      threshold: LIVENESS_THRESHOLD
    });
  }

  try {
    const vectorString = `[${embedding.join(',')}]`;

    // Find nearest neighbor using pgvector
    // <-> operator computes Euclidean distance (L2 distance)
    // Lower distance = better match
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

    const result = await pool.query(query, [vectorString]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No registered users found' 
      });
    }

    const match = result.rows[0];
    const DISTANCE_THRESHOLD = parseFloat(process.env.DISTANCE_THRESHOLD) || 0.5;

    // Check if distance is within acceptable threshold
    if (match.distance > DISTANCE_THRESHOLD) {
      // Log failed attempt
      await pool.query(
        'INSERT INTO attendance (user_id, matched_person_id, confidence, liveness_score) VALUES ($1, $2, $3, $4)',
        ['unknown', null, match.distance, livenessScore]
      );

      return res.status(404).json({
        success: false,
        error: 'No matching user found',
        distance: match.distance,
        threshold: DISTANCE_THRESHOLD
      });
    }

    // Success! Log attendance
    await pool.query(
      'INSERT INTO attendance (user_id, matched_person_id, confidence, liveness_score) VALUES ($1, $2, $3, $4)',
      [match.user_id, match.id, match.distance, livenessScore]
    );

    console.log(`✓ Attendance: ${match.name} (distance: ${match.distance.toFixed(3)}, liveness: ${livenessScore.toFixed(2)})`);

    res.json({
      success: true,
      userId: match.user_id,
      name: match.name,
      distance: match.distance,
      confidence: 1 - (match.distance / DISTANCE_THRESHOLD), // Convert distance to confidence %
      livenessScore
    });

  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ error: 'Database error during attendance check' });
  }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/people
 * List all registered people (without embeddings for performance)
 */
app.get('/api/people', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, name, created_at FROM people ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching people:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * GET /api/attendance
 * List all attendance records
 */
app.get('/api/attendance', async (req, res) => {
  try {
    const result = await pool.query(`
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
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * GET /api/export-attendance
 * Export attendance records with date filtering
 * Query params: startDate, endDate (optional)
 */
app.get('/api/export-attendance', async (req, res) => {
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
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error exporting attendance:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Distance threshold: ${process.env.DISTANCE_THRESHOLD || 0.5}`);
  console.log(`✓ Liveness threshold: ${process.env.LIVENESS_THRESHOLD || 0.6}`);
});

async function createTables(req, res, next) {
  const client = await pool.connect();
  
  try {
    // Start transaction for atomic table creation
    await client.query('BEGIN');
    
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    // People table: stores user info and face embeddings
    await client.query(`
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        embedding vector(128),  -- face-api.js produces 128-dimensional embeddings
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Attendance table: logs each attendance event
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        matched_person_id INT REFERENCES people(id) ON DELETE SET NULL,
        confidence DOUBLE PRECISION CHECK (confidence >= 0),
        liveness_score DOUBLE PRECISION CHECK (liveness_score >= 0 AND liveness_score <= 1),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Create indexes (these are idempotent with IF NOT EXISTS)
    await client.query(`
      CREATE INDEX IF NOT EXISTS people_embedding_idx 
      ON people USING ivfflat (embedding vector_l2_ops) 
      WITH (lists = 100)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS attendance_created_at_idx 
      ON attendance(created_at DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS attendance_user_id_idx 
      ON attendance(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS attendance_person_id_idx 
      ON attendance(matched_person_id)
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database tables and indexes created successfully');
    
    // Send success response if this is an HTTP endpoint
    if (res) {
      return res.status(200).json({ 
        success: true, 
        message: 'Tables created successfully' 
      });
    }
    
    // Call next middleware if available
    if (next) next();
    
  } catch (err) {
    // Rollback on error
    await client.query('ROLLBACK');
    
    console.error('Error creating tables:', err);
    
    // Send error response if this is an HTTP endpoint
    if (res) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create database tables',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    // Pass error to error handling middleware
    if (next) next(err);
    
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}