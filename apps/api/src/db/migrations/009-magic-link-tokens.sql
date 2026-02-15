-- Migration: Add magic_link_tokens table and extend refresh_tokens for participant sessions
-- Created: 2026-02-15
-- ROLLBACK: DROP TABLE IF EXISTS magic_link_tokens CASCADE;
--           ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS participant_id;
--           ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_owner_check;
--           ALTER TABLE refresh_tokens ALTER COLUMN user_id SET NOT NULL;

BEGIN;

-- Magic link tokens table (single-use, time-limited)
CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id SERIAL PRIMARY KEY,
    invite_id INTEGER NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token_hash ON magic_link_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);

-- Extend refresh_tokens to support participant sessions
-- Either user_id OR participant_id is set, never both
ALTER TABLE refresh_tokens ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_owner_check
  CHECK (
    (user_id IS NOT NULL AND participant_id IS NULL) OR
    (user_id IS NULL AND participant_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_participant_id ON refresh_tokens(participant_id);

COMMIT;
