import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin, requireDisplayCredential } from '../middleware/auth.js';
import { canAccessCollege, normalizeDepartment, scopeSqlValues } from '../utils/scope.js';

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIENTATIONS = ['landscape', 'portrait'];
const LAYOUT_MODES = ['carousel', 'split_2', 'grid_4'];
const DEFAULT_ROTATION_SECONDS = 10;

// Lead admins manage every display; other admins only their assigned colleges (see utils/scope.js).
// Campus-Wide displays are included only when the admin's allowed_colleges explicitly contains 'ALL' / 'Campus-Wide'.

// Resolve a display the user may manage. Sends the error response and returns null when not allowed.
async function loadScopedDisplay(req, res) {
  const { id } = req.params;
  if (!UUID_RE.test(id)) {
    res.status(404).json({ error: 'Display not found' });
    return null;
  }
  const result = await query("SELECT id, COALESCE(department, 'Campus-Wide') AS department FROM displays WHERE id = $1", [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Display not found' });
    return null;
  }
  if (!canAccessCollege(req.user, result.rows[0].department)) {
    res.status(403).json({ error: 'You do not have access to this display' });
    return null;
  }
  return result.rows[0];
}

// GET /api/displays - List all registered campus displays
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const allowed = scopeSqlValues(req.user);
    const params = [];
    let scope = '';
    if (allowed) {
      params.push(allowed);
      scope = " AND UPPER(COALESCE(department, 'Campus-Wide')) = ANY($1)";
    }
    const result = await query(
      `SELECT id, pairing_code, name, location, department, rotation_speed, orientation, layout_mode, is_paired, paired_at,
              CASE
                WHEN is_paired = TRUE AND is_online = TRUE AND last_seen_at IS NOT NULL AND last_seen_at >= NOW() - INTERVAL '35 seconds'
                THEN TRUE
                ELSE FALSE
              END AS is_online,
              last_seen_at, created_at, updated_at
       FROM displays WHERE is_paired = TRUE${scope} ORDER BY created_at DESC`,
      params
    );
    res.json({ displays: result.rows });
  } catch (err) {
    next(err);
  }
});

// Local wall-clock time in Asia/Manila used for daily windows and weekday recurrence
const LOCAL_TS = "(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')";

// GET /api/displays/active-content - Slide feed for physical display screens
router.get('/active-content', requireDisplayCredential, async (req, res, next) => {
  try {
    const { display_id } = req.query;
    if (display_id !== undefined && !UUID_RE.test(String(display_id))) {
      return res.status(400).json({ error: 'Invalid display_id' });
    }

    const params = [];
    let displayFilter = '';
    if (display_id) {
      params.push(display_id);
      displayFilter = ' AND d.id = $1';
    }

    // base: everything currently showable (explicitly assigned or Campus-Wide emergency);
    // visible: emergency override per display; dedup: one row per announcement
    const result = await query(
      `WITH base AS (
         SELECT
           d.id AS display_id,
           a.id AS announcement_id,
           a.title, a.body, a.image_url, a.image_urls,
           a.starts_at, a.ends_at,
           a.target_college, a.category, a.template_id, a.template_data,
           a.playback_duration, a.priority, a.created_at,
           p.full_name AS author_name,
           p.department AS author_department,
           COALESCE(d.rotation_speed, ${DEFAULT_ROTATION_SECONDS}) AS "rotationSeconds",
           d.orientation,
           BOOL_OR(a.priority = 'emergency') OVER (PARTITION BY d.id) AS display_has_emergency
         FROM announcements a
         CROSS JOIN displays d
         LEFT JOIN administrator_profiles p ON a.created_by = p.id
         LEFT JOIN announcement_displays ad ON a.id = ad.announcement_id AND ad.display_id = d.id
         WHERE a.deleted_at IS NULL
           AND a.publish_status = 'published'
           AND d.is_paired = TRUE
           AND (
             ad.display_id IS NOT NULL
             OR (a.priority = 'emergency' AND UPPER(COALESCE(a.target_college, 'ALL')) IN ('ALL', 'CAMPUS-WIDE'))
           )
           AND CURRENT_TIMESTAMP >= a.starts_at
           AND (a.ends_at IS NULL OR CURRENT_TIMESTAMP < a.ends_at)
           AND (a.recurrence_days IS NULL
                OR EXTRACT(DOW FROM CASE
                      -- Overnight window (start > end) past midnight began yesterday: use yesterday's weekday
                      WHEN a.daily_start_time > a.daily_end_time AND ${LOCAL_TS}::time < a.daily_end_time
                      THEN (${LOCAL_TS} - INTERVAL '1 day')
                      ELSE ${LOCAL_TS}
                    END)::smallint = ANY(a.recurrence_days))
           AND (
                (a.daily_start_time IS NULL AND a.daily_end_time IS NULL)
             OR (a.daily_start_time IS NOT NULL AND a.daily_end_time IS NULL
                 AND ${LOCAL_TS}::time >= a.daily_start_time)
             OR (a.daily_start_time IS NULL AND a.daily_end_time IS NOT NULL
                 AND ${LOCAL_TS}::time < a.daily_end_time)
             OR a.daily_start_time = a.daily_end_time
             OR (a.daily_start_time < a.daily_end_time
                 AND ${LOCAL_TS}::time >= a.daily_start_time AND ${LOCAL_TS}::time < a.daily_end_time)
             OR (a.daily_start_time > a.daily_end_time
                 AND (${LOCAL_TS}::time >= a.daily_start_time OR ${LOCAL_TS}::time < a.daily_end_time))
           )${displayFilter}
       ),
       visible AS (
         SELECT * FROM base WHERE NOT display_has_emergency OR priority = 'emergency'
       ),
       dedup AS (
         SELECT DISTINCT ON (announcement_id) * FROM visible ORDER BY announcement_id, created_at DESC
       )
       SELECT display_id, announcement_id, announcement_id AS id, title, body, image_url, image_urls, starts_at, ends_at,
              target_college, category, template_id, template_data, playback_duration, priority,
              author_name, author_department, "rotationSeconds", orientation, created_at
       FROM dedup
       ORDER BY (priority = 'emergency') DESC, (priority = 'priority') DESC, created_at DESC`,
      params
    );

    const overrideActive = result.rows.some((row) => row.priority === 'emergency');

    // Display-level settings are returned even when the display has no active slides
    let rotationSeconds = DEFAULT_ROTATION_SECONDS;
    let orientation = 'landscape';
    let layoutMode = 'carousel';
    let displayName = null;
    if (display_id) {
      await query(
        'UPDATE displays SET is_online = TRUE, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1',
        [display_id]
      );
      const display = await query('SELECT name, rotation_speed, orientation, layout_mode FROM displays WHERE id = $1', [display_id]);
      if (display.rows.length > 0) {
        rotationSeconds = display.rows[0].rotation_speed || DEFAULT_ROTATION_SECONDS;
        orientation = display.rows[0].orientation || 'landscape';
        layoutMode = display.rows[0].layout_mode || 'carousel';
        displayName = display.rows[0].name || null;
      }
    }

    res.json({
      rotationSeconds,
      orientation,
      layoutMode,
      displayName,
      overrideActive,
      announcements: result.rows,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/heartbeat - Display screen online/offline status beacon
router.post('/heartbeat', async (req, res, next) => {
  try {
    const { display_id, status } = req.body || {};
    if (!display_id || !UUID_RE.test(String(display_id))) {
      return res.status(400).json({ error: 'Valid display_id is required' });
    }
    const online = status !== 'offline';
    await query(
      'UPDATE displays SET is_online = $1, last_seen_at = CURRENT_TIMESTAMP WHERE id = $2',
      [online, display_id]
    );
    res.json({ success: true, is_online: online });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/displays/:id - Update rotation speed, department, orientation, and/or layout_mode
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rotation_speed, department, orientation, layout_mode } = req.body;
    const sets = [];
    const params = [];

    const display = await loadScopedDisplay(req, res);
    if (!display) return;

    if (rotation_speed !== undefined) {
      const speed = Number(rotation_speed);
      if (!Number.isFinite(speed)) {
        return res.status(400).json({ error: 'rotation_speed must be a number' });
      }
      params.push(Math.min(300, Math.max(1, Math.round(speed))));
      sets.push(`rotation_speed = $${params.length}`);
    }

    if (department !== undefined) {
      const newDepartment = normalizeDepartment(department);
      if (!canAccessCollege(req.user, newDepartment)) {
        return res.status(403).json({ error: 'You can only assign displays to your own college or campus-wide' });
      }
      params.push(newDepartment);
      sets.push(`department = $${params.length}`);
    }

    if (orientation !== undefined) {
      if (!ORIENTATIONS.includes(orientation)) {
        return res.status(400).json({ error: "orientation must be 'landscape' or 'portrait'" });
      }
      params.push(orientation);
      sets.push(`orientation = $${params.length}`);
    }

    if (layout_mode !== undefined) {
      if (!LAYOUT_MODES.includes(layout_mode)) {
        return res.status(400).json({ error: "layout_mode must be 'carousel', 'split_2', or 'grid_4'" });
      }
      params.push(layout_mode);
      sets.push(`layout_mode = $${params.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nothing to update: provide rotation_speed, department, orientation, and/or layout_mode' });
    }

    params.push(req.params.id);
    const result = await query(
      `UPDATE displays SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${params.length}
       RETURNING id, name, location, department, rotation_speed, orientation, layout_mode, is_paired, is_online, last_seen_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Display not found' });
    }

    res.json({ success: true, display: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/displays/:id - Fully remove a display record
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const display = await loadScopedDisplay(req, res);
    if (!display) return;
    await query('DELETE FROM displays WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Display removed' });
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/:id/unregister - Unpair a display (kept for backwards compat)
router.post('/:id/unregister', requireAdmin, async (req, res, next) => {
  try {
    const display = await loadScopedDisplay(req, res);
    if (!display) return;
    await query('DELETE FROM displays WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Display unlinked and removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
