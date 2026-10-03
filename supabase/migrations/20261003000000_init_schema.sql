-- ============================================================================
-- Campus Bulletin Board Digital Signage System
-- Supabase PostgreSQL Schema Migration v1.1 (Production Hardened)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 2. APPLICATION TABLES
-- ============================================================================

-- Table 1: administrator_profiles
CREATE TABLE IF NOT EXISTS public.administrator_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  middle_name text NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'administrator',
  account_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_first_name_not_blank CHECK (length(trim(first_name)) > 0),
  CONSTRAINT chk_last_name_not_blank CHECK (length(trim(last_name)) > 0),
  CONSTRAINT chk_middle_name_valid CHECK (middle_name IS NULL OR length(trim(middle_name)) > 0),
  CONSTRAINT chk_admin_role CHECK (role = 'administrator'),
  CONSTRAINT chk_account_status CHECK (account_status IN ('active', 'disabled'))
);

-- Table 2: announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  image_object_key text NULL,
  image_mime_type text NULL,
  image_version integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES public.administrator_profiles(user_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_announcement_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_announcement_body_not_blank CHECK (length(trim(body)) > 0),
  CONSTRAINT chk_announcement_schedule CHECK (ends_at > starts_at),
  CONSTRAINT chk_image_version_positive CHECK (image_version > 0),
  CONSTRAINT chk_image_consistency CHECK (
    (image_object_key IS NULL AND image_mime_type IS NULL) OR
    (image_object_key IS NOT NULL AND image_mime_type IS NOT NULL)
  )
);

-- Table 3: displays
CREATE TABLE IF NOT EXISTS public.displays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  registration_status text NOT NULL DEFAULT 'registered',
  registered_at timestamptz NOT NULL DEFAULT now(),
  unregistered_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_display_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT chk_display_location_not_blank CHECK (length(trim(location)) > 0),
  CONSTRAINT chk_registration_status_valid CHECK (registration_status IN ('registered', 'unregistered')),
  CONSTRAINT chk_registration_lifecycle CHECK (
    (registration_status = 'registered' AND unregistered_at IS NULL) OR
    (registration_status = 'unregistered' AND unregistered_at IS NOT NULL)
  )
);

-- Table 4: announcement_displays (Bridge)
-- Note: Database-level cardinality is Announcement 1 -> 0..N assignments;
-- Application logic / stored procedure requires >= 1 registered display upon publication.
CREATE TABLE IF NOT EXISTS public.announcement_displays (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  display_id uuid NOT NULL REFERENCES public.displays(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NULL REFERENCES public.administrator_profiles(user_id) ON DELETE SET NULL,
  PRIMARY KEY (announcement_id, display_id)
);

-- Table 5: pairing_sessions
CREATE TABLE IF NOT EXISTS public.pairing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  browser_session_hash text NOT NULL,
  code_hmac text NOT NULL UNIQUE,
  code_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_requested_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz NULL,
  closed_at timestamptz NULL,
  close_reason text NULL,
  display_id uuid NULL REFERENCES public.displays(id) ON DELETE SET NULL,

  CONSTRAINT chk_pairing_expiration CHECK (expires_at > created_at),
  CONSTRAINT chk_pairing_lifecycle CHECK (
    (
      closed_at IS NULL
      AND close_reason IS NULL
      AND consumed_at IS NULL
      AND display_id IS NULL
    )
    OR
    (
      closed_at IS NOT NULL
      AND close_reason = 'paired'
      AND consumed_at IS NOT NULL
      AND display_id IS NOT NULL
    )
    OR
    (
      closed_at IS NOT NULL
      AND close_reason IN ('expired', 'cancelled')
      AND consumed_at IS NULL
      AND display_id IS NULL
    )
  ),
  CONSTRAINT chk_pairing_consumed_after_created CHECK (
    consumed_at IS NULL OR consumed_at >= created_at
  )
);

-- Table 6: display_credentials
CREATE TABLE IF NOT EXISTS public.display_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id uuid NOT NULL REFERENCES public.displays(id) ON DELETE CASCADE,
  credential_hash text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  revocation_reason text NULL,

  CONSTRAINT chk_credential_revocation_consistent CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL)
    OR
    (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
  )
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_announcements_schedule 
  ON public.announcements(starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at_desc 
  ON public.announcements(created_at DESC);

-- GIN Trigram search indexes (case-insensitive substring search)
CREATE INDEX IF NOT EXISTS idx_announcements_title_trgm 
  ON public.announcements USING gin(lower(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_displays_name_trgm 
  ON public.displays USING gin(lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_displays_location_trgm 
  ON public.displays USING gin(lower(location) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_announcement_displays_disp_ann 
  ON public.announcement_displays(display_id, announcement_id);

CREATE INDEX IF NOT EXISTS idx_pairing_sessions_expires_at 
  ON public.pairing_sessions(expires_at);

-- Partial Unique: exactly one open pairing session per browser session hash
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_open_session_per_browser 
  ON public.pairing_sessions(browser_session_hash) 
  WHERE closed_at IS NULL;

-- Partial Unique: enforces at most one active (non-revoked) credential per display
CREATE UNIQUE INDEX IF NOT EXISTS one_active_credential_per_display 
  ON public.display_credentials(display_id) 
  WHERE revoked_at IS NULL;

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_administrator_profiles_updated_at ON public.administrator_profiles;
CREATE TRIGGER trg_administrator_profiles_updated_at
  BEFORE UPDATE ON public.administrator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_displays_updated_at ON public.displays;
CREATE TRIGGER trg_displays_updated_at
  BEFORE UPDATE ON public.displays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ============================================================================

ALTER TABLE public.administrator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_credentials ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: Explicitly revoke direct client access to sensitive internal tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.pairing_sessions FROM anon, authenticated;
    REVOKE ALL ON public.display_credentials FROM anon, authenticated;
  END IF;
END $$;

-- ============================================================================
-- 6. STORED PROCEDURES / ATOMIC FUNCTIONS (LOCKED DOWN)
-- ============================================================================

-- Function 1: Atomic pairing-code creation or reuse with transaction advisory lock
CREATE OR REPLACE FUNCTION public.get_or_create_pairing_session(
  p_browser_session_hash text,
  p_code_hmac text,
  p_code_ciphertext text,
  p_expires_at timestamptz
)
RETURNS public.pairing_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session public.pairing_sessions%ROWTYPE;
BEGIN
  -- 1. Acquire transaction-level advisory lock to eliminate race conditions
  PERFORM pg_advisory_xact_lock(hashtextextended(p_browser_session_hash, 0));

  -- 2. Check for an existing open session for this browser
  SELECT * INTO v_session
  FROM public.pairing_sessions
  WHERE browser_session_hash = p_browser_session_hash
    AND closed_at IS NULL
  FOR UPDATE;

  IF FOUND THEN
    -- If open and not expired, reuse and bump last_requested_at
    IF v_session.expires_at > now() THEN
      UPDATE public.pairing_sessions
      SET last_requested_at = now()
      WHERE id = v_session.id
      RETURNING * INTO v_session;

      RETURN v_session;
    ELSE
      -- Expired: close it out atomically
      UPDATE public.pairing_sessions
      SET closed_at = now(),
          close_reason = 'expired'
      WHERE id = v_session.id;
    END IF;
  END IF;

  -- 3. Insert replacement active session
  INSERT INTO public.pairing_sessions (
    browser_session_hash, code_hmac, code_ciphertext, expires_at, last_requested_at
  )
  VALUES (
    p_browser_session_hash, p_code_hmac, p_code_ciphertext, p_expires_at, now()
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- Function 2: Atomically pair and register a new display
CREATE OR REPLACE FUNCTION public.pair_new_display(
  p_code_hmac text,
  p_name text,
  p_location text,
  p_credential_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session public.pairing_sessions%ROWTYPE;
  v_display public.displays%ROWTYPE;
  v_cred public.display_credentials%ROWTYPE;
BEGIN
  -- Lock and validate open, unexpired pairing session
  SELECT * INTO v_session
  FROM public.pairing_sessions
  WHERE code_hmac = p_code_hmac
    AND closed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pairing code is invalid, expired, or already used';
  END IF;

  -- Create new logical display row
  INSERT INTO public.displays (name, location, registration_status, registered_at, unregistered_at)
  VALUES (trim(p_name), trim(p_location), 'registered', now(), NULL)
  RETURNING * INTO v_display;

  -- Store issued opaque credential hash
  INSERT INTO public.display_credentials (display_id, credential_hash, issued_at)
  VALUES (v_display.id, p_credential_hash, now())
  RETURNING * INTO v_cred;

  -- Atomically consume and close pairing session
  UPDATE public.pairing_sessions
  SET consumed_at = now(),
      closed_at = now(),
      close_reason = 'paired',
      display_id = v_display.id
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'display', row_to_json(v_display),
    'credential_id', v_cred.id
  );
END;
$$;

-- Function 3: Atomically re-register an existing unregistered display
CREATE OR REPLACE FUNCTION public.reregister_existing_display(
  p_code_hmac text,
  p_display_id uuid,
  p_credential_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session public.pairing_sessions%ROWTYPE;
  v_display public.displays%ROWTYPE;
  v_cred public.display_credentials%ROWTYPE;
BEGIN
  -- 1. Lock pairing session
  SELECT * INTO v_session
  FROM public.pairing_sessions
  WHERE code_hmac = p_code_hmac
    AND closed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pairing code is invalid, expired, or already used';
  END IF;

  -- 2. Lock target display row and strictly verify unregistered state
  SELECT * INTO v_display
  FROM public.displays
  WHERE id = p_display_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target display does not exist';
  END IF;

  IF v_display.registration_status <> 'unregistered' THEN
    RAISE EXCEPTION 'Only an unregistered display can be registered again';
  END IF;

  -- 3. Revoke any prior credentials
  UPDATE public.display_credentials
  SET revoked_at = now(),
      revocation_reason = 'reregistered'
  WHERE display_id = p_display_id
    AND revoked_at IS NULL;

  -- 4. Update display back to registered state
  UPDATE public.displays
  SET registration_status = 'registered',
      registered_at = now(),
      unregistered_at = NULL
  WHERE id = p_display_id
  RETURNING * INTO v_display;

  -- 5. Issue new credential
  INSERT INTO public.display_credentials (display_id, credential_hash, issued_at)
  VALUES (v_display.id, p_credential_hash, now())
  RETURNING * INTO v_cred;

  -- 6. Consume and close pairing session
  UPDATE public.pairing_sessions
  SET consumed_at = now(),
      closed_at = now(),
      close_reason = 'paired',
      display_id = v_display.id
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'display', row_to_json(v_display),
    'credential_id', v_cred.id
  );
END;
$$;

-- Function 4: Atomically unregister a display (idempotent)
CREATE OR REPLACE FUNCTION public.unregister_display(
  p_display_id uuid,
  p_reason text DEFAULT 'admin_unregistered'
)
RETURNS public.displays
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_display public.displays%ROWTYPE;
BEGIN
  SELECT * INTO v_display
  FROM public.displays
  WHERE id = p_display_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Display not found';
  END IF;

  -- Idempotency check: if already unregistered, preserve original unregistered_at
  IF v_display.registration_status = 'unregistered' THEN
    RETURN v_display;
  END IF;

  -- Mark display unregistered
  UPDATE public.displays
  SET registration_status = 'unregistered',
      unregistered_at = now()
  WHERE id = p_display_id
  RETURNING * INTO v_display;

  -- Revoke active credentials
  UPDATE public.display_credentials
  SET revoked_at = now(),
      revocation_reason = p_reason
  WHERE display_id = p_display_id
    AND revoked_at IS NULL;

  RETURN v_display;
END;
$$;

-- Function 5: Save announcement and sync display assignments atomically
CREATE OR REPLACE FUNCTION public.save_announcement_with_displays(
  p_id uuid,
  p_title text,
  p_body text,
  p_image_object_key text,
  p_image_mime_type text,
  p_image_version integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_actor_id uuid,
  p_display_ids uuid[]
)
RETURNS public.announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_announcement public.announcements%ROWTYPE;
  v_disp_id uuid;
  v_valid_display_count integer;
BEGIN
  -- Verification 1: Actor must be an active administrator
  IF NOT EXISTS (
    SELECT 1 FROM public.administrator_profiles
    WHERE user_id = p_actor_id AND account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active administrator account required';
  END IF;

  -- Verification 2: At least one display must be assigned
  IF p_display_ids IS NULL OR array_length(p_display_ids, 1) = 0 THEN
    RAISE EXCEPTION 'An announcement must be assigned to at least one display';
  END IF;

  -- Verification 3: All assigned displays must exist and be registered
  SELECT count(*) INTO v_valid_display_count
  FROM public.displays
  WHERE id = ANY(p_display_ids)
    AND registration_status = 'registered';

  IF v_valid_display_count <> array_length(p_display_ids, 1) THEN
    RAISE EXCEPTION 'One or more assigned displays are unregistered or do not exist';
  END IF;

  -- Insert or Update announcement
  IF p_id IS NULL THEN
    INSERT INTO public.announcements (
      title, body, image_object_key, image_mime_type, image_version,
      starts_at, ends_at, created_by
    )
    VALUES (
      trim(p_title), trim(p_body), p_image_object_key, p_image_mime_type, COALESCE(p_image_version, 1),
      p_starts_at, p_ends_at, p_actor_id
    )
    RETURNING * INTO v_announcement;
  ELSE
    -- On update: do not overwrite original created_by
    UPDATE public.announcements
    SET title = trim(p_title),
        body = trim(p_body),
        image_object_key = p_image_object_key,
        image_mime_type = p_image_mime_type,
        image_version = COALESCE(p_image_version, image_version),
        starts_at = p_starts_at,
        ends_at = p_ends_at
    WHERE id = p_id
    RETURNING * INTO v_announcement;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Announcement not found';
    END IF;

    DELETE FROM public.announcement_displays
    WHERE announcement_id = v_announcement.id;
  END IF;

  -- Assign displays
  FOREACH v_disp_id IN ARRAY p_display_ids
  LOOP
    INSERT INTO public.announcement_displays (announcement_id, display_id, assigned_at, assigned_by)
    VALUES (v_announcement.id, v_disp_id, now(), p_actor_id);
  END LOOP;

  RETURN v_announcement;
END;
$$;

-- ============================================================================
-- 7. FUNCTION PERMISSION HARDENING (REVOKE PUBLIC / GRANT SERVICE_ROLE)
-- ============================================================================

DO $$
BEGIN
  -- Always revoke from PUBLIC
  REVOKE ALL ON FUNCTION public.get_or_create_pairing_session(text, text, text, timestamptz) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.pair_new_display(text, text, text, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.reregister_existing_display(text, uuid, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.unregister_display(uuid, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.save_announcement_with_displays(uuid, text, text, text, text, integer, timestamptz, timestamptz, uuid, uuid[]) FROM PUBLIC;

  -- Revoke from Supabase client roles if present
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.get_or_create_pairing_session(text, text, text, timestamptz) FROM anon, authenticated;
    REVOKE ALL ON FUNCTION public.pair_new_display(text, text, text, text) FROM anon, authenticated;
    REVOKE ALL ON FUNCTION public.reregister_existing_display(text, uuid, text) FROM anon, authenticated;
    REVOKE ALL ON FUNCTION public.unregister_display(uuid, text) FROM anon, authenticated;
    REVOKE ALL ON FUNCTION public.save_announcement_with_displays(uuid, text, text, text, text, integer, timestamptz, timestamptz, uuid, uuid[]) FROM anon, authenticated;
  END IF;

  -- Grant execution exclusively to Supabase backend service_role if present
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.get_or_create_pairing_session(text, text, text, timestamptz) TO service_role;
    GRANT EXECUTE ON FUNCTION public.pair_new_display(text, text, text, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.reregister_existing_display(text, uuid, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.unregister_display(uuid, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.save_announcement_with_displays(uuid, text, text, text, text, integer, timestamptz, timestamptz, uuid, uuid[]) TO service_role;
  END IF;
END $$;
