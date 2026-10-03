-- ============================================================================
-- Migration: Add publish_status and deleted_at (Soft Delete) to Announcements
-- ============================================================================

-- 1. Add publish_status column (draft, published, archived)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- 2. Add validation constraint for publish_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_announcement_publish_status'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT chk_announcement_publish_status 
      CHECK (publish_status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

-- 3. Composite Index for active kiosk display queries (ignoring soft-deleted rows)
CREATE INDEX IF NOT EXISTS idx_announcements_active_feed 
  ON public.announcements(publish_status, starts_at, ends_at) 
  WHERE deleted_at IS NULL;

-- 4. Update save_announcement_with_displays stored procedure
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
  p_display_ids uuid[],
  p_publish_status text DEFAULT 'published'
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
      starts_at, ends_at, created_by, publish_status
    )
    VALUES (
      trim(p_title), trim(p_body), p_image_object_key, p_image_mime_type, COALESCE(p_image_version, 1),
      p_starts_at, p_ends_at, p_actor_id, COALESCE(p_publish_status, 'published')
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
        ends_at = p_ends_at,
        publish_status = COALESCE(p_publish_status, publish_status)
    WHERE id = p_id
      AND deleted_at IS NULL
    RETURNING * INTO v_announcement;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Announcement not found or already deleted';
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
