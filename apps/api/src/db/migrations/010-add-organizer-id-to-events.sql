-- Migration 010: Add organizer_id to events
-- Existing events get NULL organizer_id (visible to all organizers for backward compat)

ALTER TABLE events
  ADD COLUMN organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
