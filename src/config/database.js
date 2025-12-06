import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database Configuration
 * Manages PostgreSQL connection pool
 */
class Database {
  constructor() {
    this.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Reduced for cloud database
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10 seconds for cloud DB
      statement_timeout: 10000, // Query timeout
      query_timeout: 10000, // Query timeout
      ssl: {
        rejectUnauthorized: false, // Required for Render and most cloud PostgreSQL
      },
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err.message);
    });

    this.testConnection();
  }

  /**
   * Test database connection on startup
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('✓ Database connected successfully at:', result.rows[0].now);
    } catch (err) {
      console.error('❌ Database connection failed:', err.message);
      // Don't exit in development - allow retry
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  /**
   * Get database pool instance
   */
  getPool() {
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query(text, params) {
    return this.pool.query(text, params);
  }

  /**
   * Close all connections
   */
  async close() {
    await this.pool.end();
  }
}

export default new Database();
