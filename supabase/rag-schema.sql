-- Enable pgvector extension (run this as superuser / in Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents metadata table
CREATE TABLE IF NOT EXISTS rag_documents (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  size        BIGINT      NOT NULL,
  type        TEXT        NOT NULL,
  chunk_count INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks with 384-dim embeddings (all-MiniLM-L6-v2)
CREATE TABLE IF NOT EXISTS rag_chunks (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID    REFERENCES rag_documents(id) ON DELETE CASCADE,
  content     TEXT    NOT NULL,
  embedding   vector(384),
  chunk_index INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbour search
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding   vector(384),
  match_count       INT     DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id            UUID,
  document_id   UUID,
  document_name TEXT,
  content       TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.document_id,
    rd.name AS document_name,
    rc.content,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM rag_chunks rc
  JOIN rag_documents rd ON rc.document_id = rd.id
  WHERE 1 - (rc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Row Level Security
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks    ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by server-side API routes)
CREATE POLICY "service_role_rag_documents"
  ON rag_documents FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_rag_chunks"
  ON rag_chunks FOR ALL
  USING (auth.role() = 'service_role');
