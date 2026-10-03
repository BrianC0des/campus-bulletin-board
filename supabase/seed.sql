-- ============================================================================
-- Campus Bulletin Board Digital Signage System
-- Recommended Development Seed Data (v1.1)
-- ============================================================================
-- NOTE ON SUPABASE AUTH USERS:
-- administrator_profiles.user_id references auth.users(id) ON DELETE CASCADE.
-- For local development / test environments, this script inserts corresponding
-- development users into auth.users (if not already present).
-- In production, administrators must be invited or registered through the Supabase
-- Auth Admin API or Supabase Dashboard before their profile row can be inserted.
-- ============================================================================

DO $$
DECLARE
  v_admin1_id uuid := '11111111-1111-4111-8111-111111111111';
  v_admin2_id uuid := '22222222-2222-4222-8222-222222222222';

  v_disp_lib uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_disp_main uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_disp_eng uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_disp_sc uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_disp_cafe uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  v_ann_active1 uuid := '10000000-0000-4000-8000-000000000001';
  v_ann_active2 uuid := '10000000-0000-4000-8000-000000000002';
  v_ann_active3 uuid := '10000000-0000-4000-8000-000000000003';
  v_ann_sched uuid := '20000000-0000-4000-8000-000000000001';
  v_ann_exp uuid := '30000000-0000-4000-8000-000000000001';
BEGIN
  -- 1. SEED AUTH USERS (Mock development accounts in auth.users)
  INSERT INTO auth.users (id, email)
  VALUES 
    (v_admin1_id, 'sarah.connor@campus.edu'),
    (v_admin2_id, 'marcus.wright@campus.edu')
  ON CONFLICT (id) DO NOTHING;

  -- 2. SEED ADMINISTRATOR PROFILES (Composite Name demonstration)
  INSERT INTO public.administrator_profiles (user_id, first_name, middle_name, last_name, role, account_status)
  VALUES 
    (v_admin1_id, 'Sarah', 'Jane', 'Connor', 'administrator', 'active'),
    (v_admin2_id, 'Marcus', NULL, 'Wright', 'administrator', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. SEED 5 LOGICAL DISPLAYS (4 Registered, 1 Unregistered)
  INSERT INTO public.displays (id, name, location, registration_status, registered_at, unregistered_at)
  VALUES 
    (v_disp_lib, 'Library Bulletin Board', 'Library - 1st Floor Atrium', 'registered', now() - interval '30 days', NULL),
    (v_disp_main, 'Main Hall Bulletin Board', 'Main Hall - Admin Wing', 'registered', now() - interval '20 days', NULL),
    (v_disp_eng, 'Engineering Bulletin Board', 'Engineering Building - East Wing', 'registered', now() - interval '14 days', NULL),
    (v_disp_sc, 'Student Center Bulletin Board', 'Student Center - Food Court Entrance', 'registered', now() - interval '7 days', NULL),
    (v_disp_cafe, 'Cafeteria Bulletin Board', 'Campus Cafeteria - Line Area', 'unregistered', now() - interval '60 days', now() - interval '2 days')
  ON CONFLICT (id) DO NOTHING;

  -- 4. SEED SAMPLE ACTIVE DISPLAY CREDENTIALS (Hashed tokens for registered displays)
  INSERT INTO public.display_credentials (display_id, credential_hash, issued_at)
  VALUES 
    (v_disp_lib, encode(digest('seed_token_library', 'sha256'), 'hex'), now() - interval '30 days'),
    (v_disp_main, encode(digest('seed_token_main', 'sha256'), 'hex'), now() - interval '20 days'),
    (v_disp_eng, encode(digest('seed_token_eng', 'sha256'), 'hex'), now() - interval '14 days'),
    (v_disp_sc, encode(digest('seed_token_sc', 'sha256'), 'hex'), now() - interval '7 days')
  ON CONFLICT DO NOTHING;

  -- 5. SEED ANNOUNCEMENTS (Relative timestamps)
  
  -- Active 1: Image banner, assigned to several displays
  INSERT INTO public.announcements (
    id, title, body, image_object_key, image_mime_type, image_version,
    starts_at, ends_at, created_by
  ) VALUES (
    v_ann_active1,
    'Annual Campus Hackathon 2026',
    'Join us for 48 hours of innovation and building! Register online before Friday.',
    'announcements/10000000-0000-4000-8000-000000000001/1',
    'image/png',
    1,
    now() - interval '2 hours',
    now() + interval '3 days',
    v_admin1_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Active 2: Text notice, assigned to one display (Library only)
  INSERT INTO public.announcements (
    id, title, body, image_object_key, image_mime_type, image_version,
    starts_at, ends_at, created_by
  ) VALUES (
    v_ann_active2,
    'Library Extended Midterm Hours',
    'Starting this Monday, the Library will remain open until 2:00 AM for midterm study sessions.',
    NULL,
    NULL,
    1,
    now() - interval '1 day',
    now() + interval '5 days',
    v_admin1_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Active 3: Campus update, assigned to multiple displays
  INSERT INTO public.announcements (
    id, title, body, image_object_key, image_mime_type, image_version,
    starts_at, ends_at, created_by
  ) VALUES (
    v_ann_active3,
    'Engineering Career Fair Next Week',
    'Top tech employers visit the engineering quad next Wednesday starting at 10 AM.',
    NULL,
    NULL,
    1,
    now() - interval '5 hours',
    now() + interval '2 days',
    v_admin2_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Scheduled Announcement (starts in future)
  INSERT INTO public.announcements (
    id, title, body, image_object_key, image_mime_type, image_version,
    starts_at, ends_at, created_by
  ) VALUES (
    v_ann_sched,
    'Upcoming Fall Break Campus Closure',
    'All campus administrative offices will be closed starting next Friday for Fall Break.',
    NULL,
    NULL,
    1,
    now() + interval '2 days',
    now() + interval '9 days',
    v_admin2_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Expired Announcement (ended in past)
  INSERT INTO public.announcements (
    id, title, body, image_object_key, image_mime_type, image_version,
    starts_at, ends_at, created_by
  ) VALUES (
    v_ann_exp,
    'Last Week Club Orientation Fair',
    'Welcome new students! Club orientations took place at the campus grounds last weekend.',
    NULL,
    NULL,
    1,
    now() - interval '10 days',
    now() - interval '3 days',
    v_admin1_id
  ) ON CONFLICT (id) DO NOTHING;

  -- 6. SEED ANNOUNCEMENT_DISPLAYS ASSIGNMENTS
  -- Hackathon -> Main Hall, Engineering, Student Center (Several displays)
  INSERT INTO public.announcement_displays (announcement_id, display_id, assigned_at, assigned_by)
  VALUES 
    (v_ann_active1, v_disp_main, now() - interval '2 hours', v_admin1_id),
    (v_ann_active1, v_disp_eng, now() - interval '2 hours', v_admin1_id),
    (v_ann_active1, v_disp_sc, now() - interval '2 hours', v_admin1_id)
  ON CONFLICT DO NOTHING;

  -- Library Midterms -> Library only (One display)
  INSERT INTO public.announcement_displays (announcement_id, display_id, assigned_at, assigned_by)
  VALUES 
    (v_ann_active2, v_disp_lib, now() - interval '1 day', v_admin1_id)
  ON CONFLICT DO NOTHING;

  -- Career Fair -> Engineering, Main Hall
  INSERT INTO public.announcement_displays (announcement_id, display_id, assigned_at, assigned_by)
  VALUES 
    (v_ann_active3, v_disp_eng, now() - interval '5 hours', v_admin2_id),
    (v_ann_active3, v_disp_main, now() - interval '5 hours', v_admin2_id)
  ON CONFLICT DO NOTHING;

  -- Fall break -> Library, Main Hall, Student Center
  INSERT INTO public.announcement_displays (announcement_id, display_id, assigned_at, assigned_by)
  VALUES 
    (v_ann_sched, v_disp_lib, now(), v_admin2_id),
    (v_ann_sched, v_disp_main, now(), v_admin2_id),
    (v_ann_sched, v_disp_sc, now(), v_admin2_id)
  ON CONFLICT DO NOTHING;

  -- Expired notice -> Library
  INSERT INTO public.announcement_displays (announcement_id, display_id, assigned_at, assigned_by)
  VALUES 
    (v_ann_exp, v_disp_lib, now() - interval '10 days', v_admin1_id)
  ON CONFLICT DO NOTHING;

END $$;
