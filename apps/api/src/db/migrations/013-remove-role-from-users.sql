-- Phase 28: Remove role column from users table
-- The role field is vestigial after Phase 27 introduced participantId as the
-- correct session discriminant. All role-based gates have been replaced with
-- participantId-based checks throughout the codebase.
ALTER TABLE users DROP COLUMN IF EXISTS role;
