-- Phase 31: Fix onboarding_complete default for new user registrations
-- Existing users already have onboarding_complete=true (set by migration 014),
-- so this only affects future INSERTs.
ALTER TABLE users ALTER COLUMN onboarding_complete SET DEFAULT FALSE;
