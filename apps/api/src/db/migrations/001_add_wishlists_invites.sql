-- Migration: Add wishlists, wishlist_claims, and invites tables
-- Created: 2026-02-06
-- ROLLBACK: DROP TABLE IF EXISTS wishlist_claims CASCADE; DROP TABLE IF EXISTS wishlists CASCADE; DROP TABLE IF EXISTS invites CASCADE;

BEGIN;

-- Wishlists table: stores individual wishlist items for participants
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    product_url TEXT,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist claims table: tracks who claimed each wishlist item (atomic operations)
CREATE TABLE IF NOT EXISTS wishlist_claims (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    claimed_by INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id)  -- Only one claim per wishlist item, enforced at DB level
);

-- Invites table: tracks event invitations via email or phone
CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(50),
    invite_code VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wishlists_event_id ON wishlists(event_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_participant_id ON wishlists(participant_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_claims_wishlist_id ON wishlist_claims(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_claims_claimed_by ON wishlist_claims(claimed_by);
CREATE INDEX IF NOT EXISTS idx_invites_event_id ON invites(event_id);
CREATE INDEX IF NOT EXISTS idx_invites_invite_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);

-- Apply update timestamp triggers (reusing existing function)
DROP TRIGGER IF EXISTS update_wishlists_updated_at ON wishlists;
CREATE TRIGGER update_wishlists_updated_at
    BEFORE UPDATE ON wishlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invites_updated_at ON invites;
CREATE TRIGGER update_invites_updated_at
    BEFORE UPDATE ON invites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
