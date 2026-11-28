import { pool, query as poolQuery } from '../config/db.js';

// Views are defined once so the startup migration and schema.sql stay in step.
// New columns are only ever appended (CREATE OR REPLACE VIEW cannot reorder or drop columns).
const V_ANNOUNCEMENTS_SQL = `
  CREATE OR REPLACE VIEW v_announcements AS
  SELECT
    a.id, a.title, a.body, a.publish_status,
    CASE
      WHEN a.publish_status = 'draft' THEN 'draft'
      WHEN a.publish_status = 'archived' THEN 'expired'
      WHEN CURRENT_TIMESTAMP < a.starts_at THEN 'scheduled'
      WHEN CURRENT_TIMESTAMP >= a.starts_at AND (a.ends_at IS NULL OR CURRENT_TIMESTAMP < a.ends_at) THEN 'active'
      ELSE 'expired'
    END AS status,
    a.starts_at, a.ends_at, a.image_url, a.created_by,
    p.full_name AS author_name, p.department AS author_department, p.position AS author_position,
    a.created_at, a.deleted_at, a.target_college, a.image_urls,
    a.category, a.template_id, a.template_data,
    a.daily_start_time, a.daily_end_time, a.recurrence_days,
    a.playback_duration, a.priority, a.fb_post_id, a.fb_post_url,
    a.auto_match_displays
  FROM announcements a
  JOIN administrator_profiles p ON a.created_by = p.id
  WHERE a.deleted_at IS NULL`;

const V_DISPLAY_SCREEN_SQL = `
  CREATE OR REPLACE VIEW v_display_screen_announcements AS
  SELECT
    ad.display_id,
    a.id AS announcement_id,
    a.title, a.body, a.image_url, a.starts_at, a.ends_at,
    a.image_urls, a.target_college, a.category, a.template_id, a.template_data,
    a.daily_start_time, a.daily_end_time, a.recurrence_days,
    a.playback_duration, a.priority, a.fb_post_id, a.fb_post_url,
    a.auto_match_displays
  FROM announcements a
  JOIN announcement_displays ad ON a.id = ad.announcement_id
  JOIN displays d ON ad.display_id = d.id
  WHERE a.deleted_at IS NULL
    AND a.publish_status = 'published'
    AND CURRENT_TIMESTAMP >= a.starts_at
    AND (a.ends_at IS NULL OR CURRENT_TIMESTAMP < a.ends_at)
    AND d.is_paired = TRUE`;

// Bring older databases up to date with database/schema.sql (all statements are idempotent).
// Everything (ALTER TABLE, constraints, view drop/recreate) runs in one transaction so a failure
// rolls back cleanly instead of leaving the views dropped.
const schemaClient = await pool.connect();
// Every schema statement below runs on this single client so it participates in the transaction
const query = (text, params) => schemaClient.query(text, params);
let schemaTxOpen = false;
try {
  await schemaClient.query('BEGIN');
  schemaTxOpen = true;
  await query("ALTER TABLE displays ADD COLUMN IF NOT EXISTS rotation_speed INTEGER DEFAULT 10 NOT NULL");
  await query("ALTER TABLE displays ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Campus-Wide'");
  await query("ALTER TABLE displays ADD COLUMN IF NOT EXISTS orientation VARCHAR(16) DEFAULT 'landscape' CHECK (orientation IN ('landscape','portrait'))");
  await query("ALTER TABLE displays ADD COLUMN IF NOT EXISTS layout_mode VARCHAR(20) DEFAULT 'carousel' CHECK (layout_mode IN ('carousel','split_2','grid_4'))");
  await query(`
    CREATE TABLE IF NOT EXISTS colleges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(30) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(50) DEFAULT 'Academic Colleges' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  await query("ALTER TABLE colleges ADD COLUMN IF NOT EXISTS logo_url TEXT");
  const defaultColleges = [
    ['CCS', 'College of Computing Studies', 'Academic Colleges'],
    ['COE', 'College of Engineering', 'Academic Colleges'],
    ['CN', 'College of Nursing', 'Academic Colleges'],
    ['CLA', 'College of Liberal Arts', 'Academic Colleges'],
    ['CTE', 'College of Teacher Education', 'Academic Colleges'],
    ['CBA', 'College of Business & Accountancy', 'Academic Colleges'],
    ['CA', 'College of Agriculture', 'Academic Colleges'],
    ['CS', 'College of Science & Mathematics', 'Academic Colleges'],
    ['CCJE', 'College of Criminal Justice Education', 'Academic Colleges'],
    ['CSWCD', 'College of Social Work & Community Development', 'Academic Colleges'],
    ['OSA', 'Office of Student Affairs', 'Administrative Offices'],
    ['REGISTRAR', 'University Registrar', 'Administrative Offices'],
    ['LIBRARY', 'Main Campus Library', 'Administrative Offices'],
  ];
  for (const [code, name, category] of defaultColleges) {
    await query(
      `INSERT INTO colleges (code, name, category) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`,
      [code, name, category]
    );
  }
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_college VARCHAR(20) DEFAULT 'ALL'");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'general'");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS template_id VARCHAR(40) DEFAULT 'general_split'");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}'::jsonb");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS daily_start_time TIME");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS daily_end_time TIME");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS recurrence_days SMALLINT[]");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS playback_duration INTEGER");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal','priority','emergency'))");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS fb_post_id TEXT");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS fb_post_url TEXT");
  await query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS auto_match_displays BOOLEAN NOT NULL DEFAULT FALSE");
  // Per-college Facebook Page credentials ('ALL' = Campus-Wide official Page, lead_admin only)
  await query(`
    CREATE TABLE IF NOT EXISTS college_facebook_pages (
      college_code VARCHAR(60) PRIMARY KEY,
      page_id VARCHAR(120) NOT NULL,
      page_name VARCHAR(255) NOT NULL,
      page_access_token TEXT NOT NULL,
      updated_by UUID REFERENCES administrator_profiles(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query("ALTER TABLE administrator_profiles ADD COLUMN IF NOT EXISTS disabled_reason TEXT");
  await query("ALTER TABLE administrator_profiles ADD COLUMN IF NOT EXISTS allowed_colleges TEXT[] DEFAULT '{}'");
  await query("ALTER TABLE administrator_profiles ALTER COLUMN college TYPE VARCHAR(60)");
  await query("ALTER TABLE administrator_profiles DROP CONSTRAINT IF EXISTS chk_admin_status");
  await query("ALTER TABLE administrator_profiles ADD CONSTRAINT chk_admin_status CHECK (status IN ('active', 'disabled', 'pending'))");
  await query("UPDATE administrator_profiles SET allowed_colleges = ARRAY[college] WHERE (allowed_colleges IS NULL OR array_length(allowed_colleges, 1) IS NULL) AND college IS NOT NULL AND college <> 'ALL'");
  await query("DROP VIEW IF EXISTS v_display_screen_announcements");
  await query("DROP VIEW IF EXISTS v_announcements");
  await query("ALTER TABLE announcements ALTER COLUMN target_college TYPE VARCHAR(60)");
  // Indefinite announcements: ends_at becomes optional
  await query("ALTER TABLE announcements ALTER COLUMN ends_at DROP NOT NULL");
  await query("ALTER TABLE announcements DROP CONSTRAINT IF EXISTS chk_schedule_order");
  await query("ALTER TABLE announcements ADD CONSTRAINT chk_schedule_order CHECK (ends_at IS NULL OR ends_at > starts_at)");
  await query(V_ANNOUNCEMENTS_SQL);
  await query(V_DISPLAY_SCREEN_SQL);
  await schemaClient.query('COMMIT');
  schemaTxOpen = false;
} catch (err) {
  console.error('Schema sync failed:', err.message);
  if (schemaTxOpen) {
    try {
      await schemaClient.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Schema sync rollback failed:', rollbackErr.message);
    }
    schemaTxOpen = false;
  }
  // Never leave the views dropped: recreate them (best effort) after a failed sync
  try {
    await schemaClient.query(V_ANNOUNCEMENTS_SQL);
    await schemaClient.query(V_DISPLAY_SCREEN_SQL);
  } catch (viewErr) {
    console.error('Could not recreate views after failed schema sync:', viewErr.message);
  }
} finally {
  schemaClient.release();
}

// insert a new display after pairing
export async function pairNewDisplay(pairingCode, name, location) {
  const result = await poolQuery(
    `INSERT INTO displays (name, location, pairing_code, is_paired, paired_at)
     VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (pairing_code) DO UPDATE
     SET name = EXCLUDED.name, is_paired = TRUE, paired_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [name, location || null, pairingCode]
  );
  return result.rows[0];
}

// Optional scheduling/template columns shared by insert and update.
// Each entry: [column, key in announcementData]. A value of `undefined` means "leave unchanged".
const OPTIONAL_COLUMNS = [
  ['category', 'category'],
  ['template_id', 'template_id'],
  ['template_data', 'template_data'],
  ['daily_start_time', 'daily_start_time'],
  ['daily_end_time', 'daily_end_time'],
  ['recurrence_days', 'recurrence_days'],
  ['playback_duration', 'playback_duration'],
  ['priority', 'priority'],
  ['fb_post_id', 'fb_post_id'],
  ['fb_post_url', 'fb_post_url'],
  ['auto_match_displays', 'auto_match_displays'],
];

// save announcement and link it to selected displays in one go
export async function saveAnnouncementWithDisplays(announcementData, displayIds, actorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, body, starts_at, ends_at, image_url, image_urls, target_college, publish_status } = announcementData;
    const urls = Array.isArray(image_urls) ? image_urls : [];

    const columns = ['title', 'body', 'starts_at', 'ends_at', 'image_url', 'image_urls', 'target_college', 'created_by', 'publish_status'];
    const params = [
      title, body || null, starts_at, ends_at ?? null, image_url || urls[0] || null, urls,
      target_college || 'ALL', actorId, publish_status || 'published',
    ];

    for (const [column, key] of OPTIONAL_COLUMNS) {
      if (announcementData[key] !== undefined) {
        columns.push(column);
        params.push(column === 'template_data' ? JSON.stringify(announcementData[key]) : announcementData[key]);
      }
    }

    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
    const ann = await client.query(
      `INSERT INTO announcements (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      params
    );

    const annId = ann.rows[0].id;

    // Only link the displays that were explicitly selected; an empty list leaves the announcement unassigned
    const targets = Array.isArray(displayIds) ? displayIds : [];

    for (const displayId of targets) {
      await client.query(
        `INSERT INTO announcement_displays (announcement_id, display_id, assigned_by)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [annId, displayId, actorId]
      );
    }

    await client.query('COMMIT');
    return ann.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// update existing announcement and refresh display links
// Fields left `undefined` are not touched; `ends_at: null` makes the announcement indefinite.
export async function updateAnnouncementWithDisplays(id, announcementData, displayIds, actorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, body, starts_at, ends_at, image_url, image_urls, target_college, publish_status } = announcementData;

    const params = [];
    let updateQuery = 'UPDATE announcements SET updated_at = CURRENT_TIMESTAMP';
    const setIfDefined = (column, value) => {
      if (value === undefined) return;
      params.push(value);
      updateQuery += `, ${column} = $${params.length}`;
    };

    setIfDefined('title', title);
    setIfDefined('body', body);
    setIfDefined('starts_at', starts_at);
    setIfDefined('ends_at', ends_at);
    setIfDefined('image_url', image_url);
    setIfDefined('image_urls', image_urls);
    setIfDefined('target_college', target_college === undefined ? undefined : (target_college || 'ALL'));
    setIfDefined('publish_status', publish_status);

    for (const [column, key] of OPTIONAL_COLUMNS) {
      const value = announcementData[key];
      setIfDefined(column, column === 'template_data' && value !== undefined ? JSON.stringify(value) : value);
    }

    params.push(id);
    updateQuery += ` WHERE id = $${params.length} AND deleted_at IS NULL RETURNING *`;

    const ann = await client.query(updateQuery, params);

    if (displayIds && Array.isArray(displayIds)) {
      await client.query('DELETE FROM announcement_displays WHERE announcement_id = $1', [id]);
      for (const displayId of displayIds) {
        await client.query(
          `INSERT INTO announcement_displays (announcement_id, display_id, assigned_by)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [id, displayId, actorId]
        );
      }
    }

    await client.query('COMMIT');
    return ann.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
