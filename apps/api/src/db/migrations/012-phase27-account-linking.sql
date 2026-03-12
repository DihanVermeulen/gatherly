-- Phase 27: Account linking — add user_id to participants
-- Allows magic-link participants to be linked to registered user accounts
-- Safe to re-apply (IF NOT EXISTS / IF NOT EXISTS guards)

ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
