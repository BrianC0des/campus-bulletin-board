-- ============================================================================
-- 🏛️ CAMPUS BULLETIN BOARD DIGITAL SIGNAGE SYSTEM
-- Raw PostgreSQL Authoritative Schema (v1.4)
-- Engine: PostgreSQL 14+ (Standard DDL, Zero-BaaS)
-- ============================================================================

-- 1. Enable Cryptographic Functions for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: administrator_profiles
-- Entity: Authorized campus administrators managing notices and screens
-- ============================================================================
CREATE TABLE IF NOT EXISTS administrator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- TABLE: displays
-- Entity: Physical smart TV displays mounted across campus buildings
-- ============================================================================
CREATE TABLE IF NOT EXISTS displays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    pairing_code VARCHAR(10) UNIQUE,
    is_paired BOOLEAN DEFAULT FALSE NOT NULL,
    is_online BOOLEAN DEFAULT FALSE NOT NULL,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- TABLE: announcements
-- Entity: Scheduled bulletin notices with start/end windows and soft-delete
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    publish_status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    image_url TEXT,
    created_by UUID NOT NULL REFERENCES administrator_profiles(id) ON DELETE RESTRICT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Table Constraints
    CONSTRAINT chk_publish_status CHECK (publish_status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_schedule_order CHECK (ends_at > starts_at)
);

-- ============================================================================
-- TABLE: announcement_displays (Junction Table)
-- Entity: Many-to-Many association mapping notices to specific TV screens
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcement_displays (
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    display_id UUID NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES administrator_profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    PRIMARY KEY (announcement_id, display_id)
);

-- ============================================================================
-- VIEW: v_announcements
-- Purpose: Pre-calculated feed view with dynamic lifecycle status & soft-delete filter
-- ============================================================================
CREATE OR REPLACE VIEW v_announcements AS
SELECT 
    a.id,
    a.title,
    a.body,
    a.publish_status,
    CASE 
        WHEN a.publish_status = 'draft' THEN 'draft'
        WHEN a.publish_status = 'archived' THEN 'expired'
        WHEN CURRENT_TIMESTAMP < a.starts_at THEN 'scheduled'
        WHEN CURRENT_TIMESTAMP >= a.starts_at AND CURRENT_TIMESTAMP < a.ends_at THEN 'active'
        ELSE 'expired'
    END AS status,
    a.starts_at,
    a.ends_at,
    a.image_url,
    a.created_by,
    p.full_name AS author_name,
    a.created_at,
    a.deleted_at
FROM announcements a
JOIN administrator_profiles p ON a.created_by = p.id
WHERE a.deleted_at IS NULL;

-- ============================================================================
-- VIEW: v_kiosk_active_announcements
-- Purpose: Real-time active slide feed consumed by wall-mounted TV screens
-- ============================================================================
CREATE OR REPLACE VIEW v_kiosk_active_announcements AS
SELECT 
    ad.display_id,
    a.id AS announcement_id,
    a.title,
    a.body,
    a.image_url,
    a.starts_at,
    a.ends_at
FROM announcements a
JOIN announcement_displays ad ON a.id = ad.announcement_id
JOIN displays d ON ad.display_id = d.id
WHERE a.deleted_at IS NULL
  AND a.publish_status = 'published'
  AND CURRENT_TIMESTAMP >= a.starts_at
  AND CURRENT_TIMESTAMP < a.ends_at
  AND d.is_paired = TRUE;
