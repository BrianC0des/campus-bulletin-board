import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { allowedColleges, canAccessCollege, normalizeCollege, scopeSqlValues } from '../utils/scope.js';
import { upload } from '../middleware/upload.js';
import { saveAnnouncementWithDisplays, updateAnnouncementWithDisplays } from '../services/dbService.js';
import {
  buildDefaultFbMessage,
  publishToFacebookPage,
  getFacebookStatus,
  verifyAndSaveFacebookConfig,
  disconnectFacebookConfig,
} from '../services/facebookService.js';

const router = express.Router();

// Accept multiple files under 'images' (up to 10) and a single legacy 'image' file
const uploadImages = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
]);

const MAX_IMAGES = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DISPLAY_IDS = 200;
const VALID_COLLEGES = [
  'ALL', 'CAMPUS-WIDE', 'CCS', 'COE', 'CN', 'CLA', 'CTE', 'CBA',
  'CA', 'CFES', 'CHE', 'CJ', 'CCJE', 'CM', 'CPADS', 'CS', 'CSPEAR', 'CSWCD', 'COL',
  'OSA', 'REGISTRAR', 'LIBRARY',
];
const TEMPLATE_IDS = [
  'general_split',
  'image_only',
  'event_spotlight',
  'emergency_banner',
  'deadline_callout',
  'achievement_spotlight',
  'weekly_digest',
];
const PUBLISH_STATUSES = ['draft', 'published'];
const PRIORITIES = ['normal', 'priority', 'emergency'];
const MAX_TEMPLATE_DATA_BYTES = 20000;

// Uploaded file URLs: prefer the URLs set by the upload middleware (R2 or local),
// falling back to the legacy /uploads/<filename> mapping
function uploadedUrls(req) {
  if (Array.isArray(req.files?.uploadedUrls)) return req.files.uploadedUrls;
  const files = [...(req.files?.images || []), ...(req.files?.image || [])];
  return files.map((f) => f.url || `/uploads/${f.filename}`);
}

// image_urls may arrive as a JSON string, an array, or be absent (undefined)
function parseJsonArray(value) {
  if (value === undefined || value === null || value === '') return undefined;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseImageUrls(value) {
  const list = parseJsonArray(value);
  return list ? list.filter((u) => typeof u === 'string') : undefined;
}

function parseCollege(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return 'ALL';
  const upper = trimmed.toUpperCase();
  if (upper === 'ALL' || upper === 'CAMPUS-WIDE') return 'ALL';
  if (VALID_COLLEGES.includes(upper)) return upper;
  if (/^[A-Za-z0-9 &.,/_-]{1,60}$/.test(trimmed)) return trimmed;
  return null;
}

// --- College scoping -------------------------------------------------------

// Lead admins see & manage everything; College Admins are strictly scoped to their assigned college(s)
// without overlapping Campus-Wide ('ALL') or other colleges' announcements. The shared helpers live in
// utils/scope.js; 'ALL' / 'Campus-Wide' is only in scope when allowed_colleges explicitly contains it.

// Everyone with admin access may read campus-wide announcements; otherwise the college must be in scope.
function canReadAnnouncement(user, targetCollege) {
  const allowed = allowedColleges(user);
  const target = normalizeCollege(targetCollege);
  return !allowed || target === 'ALL' || allowed.includes(target);
}

// --- Field validation ------------------------------------------------------

const isBlank = (v) => v === undefined || v === null || v === '' || v === 'null';
const isTrue = (v) => v === true || v === 'true' || v === '1' || v === 1;

// Recursively copy a plain JSON value, dropping anything that is not string/number/boolean/null/array/object
function sanitizeJson(value, depth = 0) {
  if (depth > 6) return null;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeJson(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, v] of Object.entries(value).slice(0, 50)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      out[key.slice(0, 100)] = sanitizeJson(v, depth + 1);
    }
    return out;
  }
  return null;
}

function parseTime(value) {
  if (isBlank(value)) return { value: null };
  const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(value).trim());
  if (!match) return { error: true };
  return { value: `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}` };
}

// Validate the template / scheduling fields. Absent fields stay `undefined` (= unchanged on update).
function parseAnnouncementFields(src) {
  const data = {};

  if (src.category !== undefined) {
    const category = String(src.category).trim().toLowerCase() || 'general';
    if (!/^[a-z0-9_-]{1,30}$/.test(category)) return { error: 'Invalid category' };
    data.category = category;
  }

  if (src.template_id !== undefined) {
    const templateId = String(src.template_id).trim() || 'general_split';
    if (!TEMPLATE_IDS.includes(templateId)) return { error: 'Invalid template_id' };
    data.template_id = templateId;
  }

  if (src.template_data !== undefined) {
    let raw = src.template_data;
    if (typeof raw === 'string') {
      if (raw.length > MAX_TEMPLATE_DATA_BYTES) return { error: 'template_data is too large' };
      try {
        raw = raw.trim() === '' ? {} : JSON.parse(raw);
      } catch {
        return { error: 'template_data must be valid JSON' };
      }
    }
    if (raw === null) raw = {};
    if (typeof raw !== 'object' || Array.isArray(raw)) return { error: 'template_data must be a JSON object' };
    const clean = sanitizeJson(raw);
    if (JSON.stringify(clean).length > MAX_TEMPLATE_DATA_BYTES) return { error: 'template_data is too large' };
    data.template_data = clean;
  }

  if (src.publish_status !== undefined) {
    if (!PUBLISH_STATUSES.includes(src.publish_status)) {
      return { error: "publish_status must be 'draft' or 'published'" };
    }
    data.publish_status = src.publish_status;
  }

  if (src.priority !== undefined) {
    const priority = String(src.priority).trim().toLowerCase() || 'normal';
    if (!PRIORITIES.includes(priority)) return { error: "priority must be 'normal', 'priority' or 'emergency'" };
    data.priority = priority;
  }

  if (src.starts_at !== undefined && !isBlank(src.starts_at)) {
    if (Number.isNaN(Date.parse(src.starts_at))) return { error: 'Invalid starts_at' };
    data.starts_at = src.starts_at;
  }

  // Indefinite announcements have no end date
  if (isTrue(src.indefinite) || src.ends_at === null || src.ends_at === 'null') {
    data.ends_at = null;
  } else if (src.ends_at !== undefined && src.ends_at !== '') {
    if (Number.isNaN(Date.parse(src.ends_at))) return { error: 'Invalid ends_at' };
    data.ends_at = src.ends_at;
  }

  for (const key of ['daily_start_time', 'daily_end_time']) {
    if (src[key] !== undefined) {
      const parsed = parseTime(src[key]);
      if (parsed.error) return { error: `${key} must be HH:MM` };
      data[key] = parsed.value;
    }
  }

  if (src.recurrence_days !== undefined) {
    if (isBlank(src.recurrence_days)) {
      data.recurrence_days = null;
    } else {
      const list = parseJsonArray(src.recurrence_days);
      if (!list) return { error: 'recurrence_days must be an array of 0..6' };
      const days = [...new Set(list.map(Number))];
      if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
        return { error: 'recurrence_days must only contain integers 0..6' };
      }
      data.recurrence_days = days.length > 0 ? days.sort((a, b) => a - b) : null;
    }
  }

  if (src.playback_duration !== undefined) {
    if (isBlank(src.playback_duration)) {
      data.playback_duration = null;
    } else {
      const seconds = Number(src.playback_duration);
      if (!Number.isInteger(seconds) || seconds < 3 || seconds > 300) {
        return { error: 'playback_duration must be an integer between 3 and 300 seconds' };
      }
      data.playback_duration = seconds;
    }
  }

  if (src.auto_match_displays !== undefined) {
    data.auto_match_displays = isTrue(src.auto_match_displays);
  }

  const start = data.starts_at;
  if (start && data.ends_at && Date.parse(data.ends_at) <= Date.parse(start)) {
    return { error: 'ends_at must be after starts_at' };
  }

  return { data };
}

// Parse display_ids. Returns { ids } (undefined = field absent/blank, leave links untouched) or { error }.
// Malformed input is rejected rather than treated as an empty list, which would wipe existing assignments.
function parseDisplayIds(value) {
  if (value === undefined || value === null || value === '') return { ids: undefined };
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { error: 'display_ids must be a valid JSON array of display UUIDs' };
    }
  }
  if (!Array.isArray(parsed)) return { error: 'display_ids must be an array of display UUIDs' };
  if (parsed.length > MAX_DISPLAY_IDS) return { error: `display_ids may contain at most ${MAX_DISPLAY_IDS} entries` };
  if (!parsed.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
    return { error: 'display_ids must only contain valid display UUIDs' };
  }
  return { ids: [...new Set(parsed.map((id) => id.toLowerCase()))] };
}

// Non-lead admins may only assign announcements to displays inside their assigned college scope.
// displayIds must already be validated by parseDisplayIds.
async function filterDisplayIdsForUser(user, displayIds) {
  const allowed = scopeSqlValues(user);
  if (!allowed || !Array.isArray(displayIds) || displayIds.length === 0) return displayIds;
  const result = await query(
    `SELECT id FROM displays
     WHERE id = ANY($1::uuid[]) AND UPPER(COALESCE(department, 'Campus-Wide')) = ANY($2)`,
    [displayIds, allowed]
  );
  return result.rows.map((r) => r.id);
}

// Final display set for an update. A scoped admin only controls links inside their own scope, so links to
// out-of-scope displays already on the announcement are carried over untouched; lead admins replace everything.
async function resolveDisplayLinksForUpdate(user, announcementId, requestedIds) {
  if (requestedIds === undefined) return undefined;
  const inScope = await filterDisplayIdsForUser(user, requestedIds);
  if (!allowedColleges(user)) return inScope;

  const existing = await query(
    `SELECT ad.display_id AS id, COALESCE(d.department, 'Campus-Wide') AS department
     FROM announcement_displays ad
     JOIN displays d ON d.id = ad.display_id
     WHERE ad.announcement_id = $1`,
    [announcementId]
  );
  const preserved = existing.rows.filter((r) => !canAccessCollege(user, r.department)).map((r) => r.id);
  return [...new Set([...preserved, ...inScope])];
}

// --- Facebook Page scope --------------------------------------------------

// Facebook Page credentials live in college_facebook_pages, one row per college; 'ALL' is the Campus-Wide
// official Page, configurable only by lead admins. Returns { college } or { status, error }.
function resolveFacebookScope(user, requested) {
  const isLead = user?.role === 'lead_admin';
  const raw = String(requested ?? '').trim();

  let college;
  if (!raw) {
    // No explicit target: lead admins default to Campus-Wide, college admins to their first assigned college
    college = isLead ? 'ALL' : (allowedColleges(user) || []).find((c) => c !== 'ALL');
    if (!college) {
      return { status: 403, error: 'No college is assigned to your account' };
    }
  } else {
    const parsed = parseCollege(raw);
    if (!parsed) {
      return { status: 400, error: 'Invalid college' };
    }
    college = normalizeCollege(parsed);
  }

  if (isLead) {
    if (college !== 'ALL') {
      return { status: 403, error: 'Lead Administrators only manage the Campus-Wide Facebook Page' };
    }
    return { college: 'ALL' };
  }

  if (college === 'ALL') {
    return { status: 403, error: 'Only Lead Administrators can manage the Campus-Wide Facebook Page' };
  }
  if (!canAccessCollege(user, college)) {
    return { status: 403, error: 'You do not have access to this college' };
  }
  return { college };
}

// GET /api/announcements/facebook/status?college=... - Check whether the college's Facebook Page is connected
router.get('/facebook/status', requireAdmin, async (req, res, next) => {
  try {
    const scope = resolveFacebookScope(req.user, req.query.college);
    if (scope.error) return res.status(scope.status).json({ error: scope.error });
    res.json(await getFacebookStatus(scope.college));
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements/facebook/config - Verify and save a college's FB Page ID & Access Token
router.post('/facebook/config', requireAdmin, async (req, res, next) => {
  try {
    const { page_id, access_token, college } = req.body || {};
    const scope = resolveFacebookScope(req.user, college);
    if (scope.error) return res.status(scope.status).json({ error: scope.error });
    const saved = await verifyAndSaveFacebookConfig({
      collegeCode: scope.college,
      pageId: page_id,
      accessToken: access_token,
      updatedBy: req.user.id,
    });
    res.json({ success: true, ...saved });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not verify Facebook Page credentials' });
  }
});

async function findAnnouncement(id) {
  const result = await query(
    'SELECT id, target_college, image_url, image_urls FROM announcements WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0];
}

// DELETE /api/announcements/facebook/config?college=... - Disconnect a college's Facebook Page (back to demo mode)
router.delete('/facebook/config', requireAdmin, async (req, res, next) => {
  try {
    const scope = resolveFacebookScope(req.user, req.query.college ?? req.body?.college);
    if (scope.error) return res.status(scope.status).json({ error: scope.error });
    res.json(await disconnectFacebookConfig(scope.college));
  } catch (err) {
    next(err);
  }
});

// GET /api/announcements - List announcements with computed status and assigned screens
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const allowed = scopeSqlValues(req.user);
    const params = [];
    let where = '';
    if (allowed) {
      params.push(['ALL', 'CAMPUS-WIDE', ...allowed.filter((c) => c !== 'ALL' && c !== 'CAMPUS-WIDE')]);
      where = `WHERE UPPER(COALESCE(a.target_college, 'ALL')) = ANY($1)`;
    }

    const result = await query(
      `SELECT
         a.id, a.title, a.body, a.publish_status, a.status, a.starts_at, a.ends_at,
         a.image_url, a.image_urls, a.target_college, a.category, a.template_id, a.template_data,
         a.daily_start_time, a.daily_end_time, a.recurrence_days, a.playback_duration, a.priority,
         a.fb_post_id, a.fb_post_url, a.auto_match_displays,
         a.created_by, a.author_name, a.author_department, a.author_position, a.created_at,
         COALESCE(
           (SELECT json_agg(json_build_object('id', d.id, 'name', d.name))
            FROM announcement_displays ad
            JOIN displays d ON ad.display_id = d.id
            WHERE ad.announcement_id = a.id),
           '[]'
         ) AS assigned_displays
       FROM v_announcements a
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );
    res.json({ announcements: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/announcements/:id - Get single announcement
router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM v_announcements WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (!canReadAnnouncement(req.user, result.rows[0].target_college)) {
      return res.status(403).json({ error: 'You do not have access to this announcement' });
    }
    res.json({ announcement: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements - Create new announcement with optional image and screen targeting
router.post('/', requireAdmin, uploadImages, async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const uploaded = uploadedUrls(req);
    const imageUrls = (uploaded.length > 0 ? uploaded : (parseImageUrls(req.body.image_urls) || [])).slice(0, MAX_IMAGES);
    const imageUrl = imageUrls[0] || req.body.image_url || null;

    const targetCollege = parseCollege(req.body.target_college);
    if (targetCollege === null) {
      return res.status(400).json({ error: 'Invalid target college' });
    }
    if (!canAccessCollege(req.user, targetCollege || 'ALL')) {
      return res.status(403).json({ error: 'You can only post to your own college or campus-wide' });
    }

    const parsed = parseAnnouncementFields(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const fields = parsed.data;

    const resolvedTitle = (title && title.trim()) || (imageUrl ? 'Graphic Poster' : '');
    if (!resolvedTitle && !body && !imageUrl) {
      return res.status(400).json({ error: 'Please provide a title, content, or upload an image.' });
    }

    const parsedDisplayIds = parseDisplayIds(req.body.display_ids);
    if (parsedDisplayIds.error) {
      return res.status(400).json({ error: parsedDisplayIds.error });
    }
    const displayIds = await filterDisplayIdsForUser(req.user, parsedDisplayIds.ids || []);

    // ends_at: explicit null = indefinite; missing = default 7-day window
    const endsAt = fields.ends_at === undefined
      ? new Date(Date.now() + 7 * 86400000).toISOString()
      : fields.ends_at;

    const announcement = await saveAnnouncementWithDisplays(
      {
        ...fields,
        title: resolvedTitle || 'Campus Notice',
        body: body ? body.trim() : null,
        starts_at: fields.starts_at || new Date().toISOString(),
        ends_at: endsAt,
        image_url: imageUrl,
        image_urls: imageUrls,
        target_college: targetCollege || 'ALL',
      },
      displayIds,
      req.user.id
    );

    res.status(201).json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// PUT /api/announcements/:id - Update existing announcement
router.put('/:id', requireAdmin, uploadImages, async (req, res, next) => {
  try {
    const existing = await findAnnouncement(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (!canAccessCollege(req.user, existing.target_college)) {
      return res.status(403).json({ error: 'You do not have access to this announcement' });
    }

    const { title, body } = req.body;
    const uploaded = uploadedUrls(req);

    // Photo editing: keep the retained existing photos (only ones this announcement already owns),
    // then append any new uploads, capped at MAX_IMAGES. Without retained_image_urls the legacy
    // behaviour applies (new uploads replace the gallery, or image_urls is taken as sent).
    let imageUrls;
    const retained = parseImageUrls(req.body.retained_image_urls);
    if (req.body.retained_image_urls !== undefined && retained !== undefined) {
      const owned = new Set([...(existing.image_urls || []), existing.image_url].filter(Boolean));
      const kept = retained.filter((u) => owned.has(u));
      imageUrls = [...new Set([...kept, ...uploaded])].slice(0, MAX_IMAGES);
    } else if (uploaded.length > 0) {
      imageUrls = uploaded.slice(0, MAX_IMAGES);
    } else {
      imageUrls = parseImageUrls(req.body.image_urls);
    }
    const imageUrl = imageUrls !== undefined ? (imageUrls[0] || null) : req.body.image_url;

    const targetCollege = parseCollege(req.body.target_college);
    if (targetCollege === null) {
      return res.status(400).json({ error: 'Invalid target college' });
    }
    if (targetCollege !== undefined && !canAccessCollege(req.user, targetCollege)) {
      return res.status(403).json({ error: 'You can only post to your own college or campus-wide' });
    }

    const parsed = parseAnnouncementFields(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const fields = parsed.data;

    const resolvedTitle = title === undefined
      ? undefined
      : ((title && title.trim()) || (imageUrl ? 'Graphic Poster' : 'Campus Notice'));
    const resolvedBody = body === undefined ? undefined : (body ? body.trim() : null);

    const parsedDisplayIds = parseDisplayIds(req.body.display_ids);
    if (parsedDisplayIds.error) {
      return res.status(400).json({ error: parsedDisplayIds.error });
    }
    const displayIds = await resolveDisplayLinksForUpdate(req.user, req.params.id, parsedDisplayIds.ids);

    const announcement = await updateAnnouncementWithDisplays(
      req.params.id,
      {
        ...fields,
        title: resolvedTitle,
        body: resolvedBody,
        image_url: imageUrl,
        image_urls: imageUrls,
        target_college: targetCollege,
      },
      displayIds,
      req.user.id
    );

    res.json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/announcements/:id/priority - Lightweight 1-click priority toggle
router.patch('/:id/priority', requireAdmin, async (req, res, next) => {
  try {
    const existing = await findAnnouncement(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (!canAccessCollege(req.user, existing.target_college)) {
      return res.status(403).json({ error: 'You do not have access to this announcement' });
    }

    const priority = String(req.body?.priority ?? '').trim().toLowerCase();
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "priority must be 'normal', 'priority' or 'emergency'" });
    }

    const announcement = await updateAnnouncementWithDisplays(
      req.params.id,
      { priority },
      undefined,
      req.user.id
    );

    res.json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements/:id/facebook - Confirm & publish announcement to its college's Facebook Page
router.post('/:id/facebook', requireAdmin, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM v_announcements WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    const ann = result.rows[0];
    const targetCollege = normalizeCollege(ann.target_college);
    if (req.user.role === 'lead_admin') {
      if (targetCollege !== 'ALL') {
        return res.status(403).json({ error: 'College-scoped notices are bulletin-board only for Lead Admins' });
      }
    } else if (targetCollege === 'ALL' || !canAccessCollege(req.user, ann.target_college)) {
      return res.status(403).json({ error: 'You do not have access to publish this announcement to Facebook' });
    }
    if (ann.publish_status === 'draft' || ann.status === 'draft') {
      return res.status(400).json({ error: 'Draft announcements cannot be shared to Facebook. Publish the announcement first.' });
    }
    if (ann.status === 'expired') {
      return res.status(400).json({ error: 'Expired announcements cannot be shared to Facebook.' });
    }

    const customMessage = typeof req.body?.custom_message === 'string'
      ? req.body.custom_message.trim()
      : buildDefaultFbMessage(ann);
    const orientation = req.body?.orientation === 'portrait' ? 'portrait' : 'landscape';
    const imageUrls = Array.isArray(ann.image_urls) && ann.image_urls.length > 0
      ? ann.image_urls
      : ann.image_url
        ? [ann.image_url]
        : [];

    const published = await publishToFacebookPage({
      collegeCode: normalizeCollege(ann.target_college),
      message: customMessage,
      imageUrls,
      generatedImageBase64: req.body?.generated_image_base64 || null,
      orientation,
      published: req.body?.published !== false && req.body?.visibility !== 'draft',
      includeMedia: req.body?.include_media !== false,
    });

    // Demo mode (no Page connected for this college): never persist simulated sim_* IDs
    if (published.simulated) {
      return res.json({
        success: true,
        fb_post_id: null,
        fb_post_url: null,
        simulated: true,
        orientation: published.orientation,
        announcement: ann,
      });
    }

    const updated = await query(
      `UPDATE announcements
       SET fb_post_id = $1, fb_post_url = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [published.fb_post_id, published.fb_post_url, req.params.id]
    );

    res.json({
      success: true,
      fb_post_id: published.fb_post_id,
      fb_post_url: published.fb_post_url,
      simulated: published.simulated,
      orientation: published.orientation,
      announcement: updated.rows[0] || ann,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/announcements/:id - Soft-delete announcement
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await findAnnouncement(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (!canAccessCollege(req.user, existing.target_college)) {
      return res.status(403).json({ error: 'You do not have access to this announcement' });
    }
    await query('UPDATE announcements SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
