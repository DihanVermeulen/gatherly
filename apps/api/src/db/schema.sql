-- gatherly Application Database Schema

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    couple_crossing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, name)
);

-- Couples table (pairs of participants who are together)
CREATE TABLE IF NOT EXISTS couples (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person1_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    person2_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_people CHECK (person1_id != person2_id)
);

-- Assignments table (who buys for whom)
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    giver_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    code_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_giver_receiver CHECK (giver_id != receiver_id)
);

-- Gifts table (wishlist items for an event)
CREATE TABLE IF NOT EXISTS gifts (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    added_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gift claims table (tracks who is buying which gift)
CREATE TABLE IF NOT EXISTS gift_claims (
    id SERIAL PRIMARY KEY,
    gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
    claimed_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gift_id)
);

-- Wishlists table (stores individual wishlist items for participants)
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

-- Wishlist claims table (tracks who claimed each wishlist item)
CREATE TABLE IF NOT EXISTS wishlist_claims (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    claimed_by INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id)
);

-- Invites table (tracks event invitations via email or phone)
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
    expires_at TIMESTAMP DEFAULT NULL
);

-- Users table (authenticated users with role-based access)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table (stores hashed refresh tokens for JWT rotation)
-- Supports both user sessions (user_id set) and participant magic-link sessions (participant_id set)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT refresh_tokens_owner_check CHECK (
        (user_id IS NOT NULL AND participant_id IS NULL) OR
        (user_id IS NULL AND participant_id IS NOT NULL)
    )
);

-- Magic link tokens table (single-use, time-limited)
CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id SERIAL PRIMARY KEY,
    invite_id INTEGER NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_couples_event_id ON couples(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_event_id ON assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_giver_id ON assignments(giver_id);
CREATE INDEX IF NOT EXISTS idx_gifts_event_id ON gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_gift_claims_gift_id ON gift_claims(gift_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_event_id ON wishlists(event_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_participant_id ON wishlists(participant_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_claims_wishlist_id ON wishlist_claims(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_claims_claimed_by ON wishlist_claims(claimed_by);
CREATE INDEX IF NOT EXISTS idx_invites_event_id ON invites(event_id);
CREATE INDEX IF NOT EXISTS idx_invites_invite_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_participant_id ON refresh_tokens(participant_id);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token_hash ON magic_link_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gifts_updated_at ON gifts;
CREATE TRIGGER update_gifts_updated_at
    BEFORE UPDATE ON gifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
