-- Migration 011: Phase 25 — Event Modules Foundation + Polls & RSVP
--   Also backfills missing columns from Phases 22 & 24 that had no dedicated migration.
-- Created: 2026-03-09
-- ROLLBACK:
--   DROP TABLE IF EXISTS module_rsvp_responses CASCADE;
--   DROP TABLE IF EXISTS module_poll_votes CASCADE;
--   DROP TABLE IF EXISTS module_poll_options CASCADE;
--   DROP TABLE IF EXISTS module_polls CASCADE;
--   DROP TABLE IF EXISTS event_modules CASCADE;
--   ALTER TABLE events DROP COLUMN IF EXISTS plan_tier;
--   ALTER TABLE events DROP COLUMN IF EXISTS event_date;
--   ALTER TABLE events DROP COLUMN IF EXISTS wishlist_deadline;
--   ALTER TABLE events DROP COLUMN IF EXISTS feature_flags;
--   ALTER TABLE wishlists DROP COLUMN IF EXISTS sort_order;
--   ALTER TABLE wishlists DROP COLUMN IF EXISTS price_pence;
--   ALTER TABLE invites DROP COLUMN IF EXISTS created_by_user_id;
--   ALTER TABLE invites DROP COLUMN IF EXISTS expires_at;

BEGIN;

-- ── Phase 22 columns (event metadata) ──────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date TIMESTAMP DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS wishlist_deadline TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

-- ── Phase 24 columns (feature flags, budget) ───────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS price_pence INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_wishlists_sort_order ON wishlists(event_id, participant_id, sort_order);

-- ── Invites columns missing from migration 001 ─────────────────────────────
ALTER TABLE invites ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);

-- ── Phase 25 column ────────────────────────────────────────────────────────
-- Plan tier on events (free events only get Gift Exchange module)
ALTER TABLE events ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) DEFAULT 'free';

-- Core modules registry
-- module_type: 'gift_exchange' | 'polls' | 'potluck' | 'rsvp' | 'white_elephant'
-- status:      'active' | 'closed' | 'draft'
CREATE TABLE IF NOT EXISTS event_modules (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  module_type VARCHAR(50) NOT NULL,
  config     JSONB DEFAULT '{}',
  status     VARCHAR(20) DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, module_type)
);

CREATE INDEX IF NOT EXISTS idx_event_modules_event_id ON event_modules(event_id);

-- Backfill: give every existing event a gift_exchange module
INSERT INTO event_modules (event_id, module_type, status, sort_order)
SELECT id, 'gift_exchange', 'active', 0
FROM events
ON CONFLICT (event_id, module_type) DO NOTHING;

-- Polls
CREATE TABLE IF NOT EXISTS module_polls (
  id             SERIAL PRIMARY KEY,
  event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  module_id      INTEGER NOT NULL REFERENCES event_modules(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  deadline       TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_polls_event_id ON module_polls(event_id);

-- Poll options
CREATE TABLE IF NOT EXISTS module_poll_options (
  id          SERIAL PRIMARY KEY,
  poll_id     INTEGER NOT NULL REFERENCES module_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

-- Poll votes (one row per participant per option; unique prevents double-voting)
CREATE TABLE IF NOT EXISTS module_poll_votes (
  id             SERIAL PRIMARY KEY,
  poll_id        INTEGER NOT NULL REFERENCES module_polls(id) ON DELETE CASCADE,
  option_id      INTEGER NOT NULL REFERENCES module_poll_options(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(poll_id, option_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_module_poll_votes_poll_id ON module_poll_votes(poll_id);

-- RSVP responses (upserted on submit)
-- status: 'accepted' | 'declined' | 'maybe' | 'pending'
CREATE TABLE IF NOT EXISTS module_rsvp_responses (
  id             SERIAL PRIMARY KEY,
  event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status         VARCHAR(20) DEFAULT 'pending',
  headcount      INTEGER DEFAULT 1,
  note           TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_module_rsvp_event_id ON module_rsvp_responses(event_id);

COMMIT;
