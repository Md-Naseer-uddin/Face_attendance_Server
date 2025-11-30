-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- People table: stores user info and face embeddings
CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    embedding vector(128),  -- face-api.js produces 128-dimensional embeddings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table: logs each attendance event
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    matched_person_id INT REFERENCES people(id),
    confidence DOUBLE PRECISION,  -- Distance metric (lower = better match)
    liveness_score DOUBLE PRECISION,  -- 0.0 to 1.0
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector similarity search using IVFFlat
-- lists parameter: good rule of thumb is rows/1000 for up to 1M vectors
-- For 150 users, 100 lists is reasonable
-- For 1000+ users, consider increasing to 200-500 lists
CREATE INDEX IF NOT EXISTS people_embedding_idx 
ON people USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 100);

-- Regular indexes for common queries
CREATE INDEX IF NOT EXISTS attendance_created_at_idx 
ON attendance(created_at DESC);

CREATE INDEX IF NOT EXISTS attendance_user_id_idx 
ON attendance(user_id);

CREATE INDEX IF NOT EXISTS attendance_person_id_idx 
ON attendance(matched_person_id);

-- Note: vector(128) assumes face-api.js 128-dimensional embeddings
-- If using different model, adjust dimension accordingly