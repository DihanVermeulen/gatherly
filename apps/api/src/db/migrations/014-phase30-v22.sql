-- Migration 014: Phase 30 — Infrastructure v2.2
--   Adds potluck tables, new events columns, and new users columns.
--   All changes are idempotent (safe to run multiple times).
-- Created: 2026-03-18
-- ROLLBACK:
--   DROP TABLE IF EXISTS module_potluck_signups CASCADE;
--   DROP TABLE IF EXISTS module_potluck_categories CASCADE;
--   ALTER TABLE events DROP COLUMN IF EXISTS location;
--   ALTER TABLE events DROP COLUMN IF EXISTS cover_photo;
--   ALTER TABLE events DROP COLUMN IF EXISTS allow_guest_invites;
--   ALTER TABLE events DROP COLUMN IF EXISTS is_public;
--   ALTER TABLE users DROP COLUMN IF EXISTS bio;
--   ALTER TABLE users DROP COLUMN IF EXISTS interests;
--   ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
--   ALTER TABLE users DROP COLUMN IF EXISTS onboarding_complete;

BEGIN;

-- ── Users table — new profile / onboarding columns ─────────────────────────
-- bio: free-form profile text
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- interests: JSON array of interest strings (e.g. ["cooking","hiking"])
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSONB NOT NULL DEFAULT '[]';

-- avatar_url: URL string pointing to profile image (not base64)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- onboarding_complete: TRUE for existing users so they skip onboarding flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Events table — new discovery / visibility columns ──────────────────────
-- location: free-form venue/address string
ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;

-- cover_photo: URL string pointing to event cover image (NOT base64)
-- Note: list endpoint should return hasCoverPhoto flag only, not the URL itself.
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_photo TEXT DEFAULT NULL;

-- allow_guest_invites: whether non-organiser participants can invite others
ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_guest_invites BOOLEAN NOT NULL DEFAULT FALSE;

-- is_public: whether the event is discoverable / joinable without an invite
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Potluck categories ──────────────────────────────────────────────────────
-- One row per dish/item category per event. Organisers configure these.
CREATE TABLE IF NOT EXISTS module_potluck_categories (
  id               SERIAL PRIMARY KEY,
  event_id         INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  food_image_url   TEXT DEFAULT NULL,
  suggestion_chips JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potluck_categories_event_id
  ON module_potluck_categories(event_id);

-- Apply updated_at trigger using the project-standard trigger function.
DROP TRIGGER IF EXISTS set_potluck_categories_updated_at ON module_potluck_categories;
CREATE TRIGGER set_potluck_categories_updated_at
  BEFORE UPDATE ON module_potluck_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Potluck signups ─────────────────────────────────────────────────────────
-- One row per participant per category slot claimed.
CREATE TABLE IF NOT EXISTS module_potluck_signups (
  id               SERIAL PRIMARY KEY,
  event_id         INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id      INTEGER NOT NULL REFERENCES module_potluck_categories(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  note             TEXT DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potluck_signups_category_id
  ON module_potluck_signups(category_id);

-- Prevent duplicate signup for the same participant in the same category.
CREATE UNIQUE INDEX IF NOT EXISTS idx_potluck_signups_unique_participant
  ON module_potluck_signups(category_id, participant_name);

COMMIT;
