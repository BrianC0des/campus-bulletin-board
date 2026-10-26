import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { saveAnnouncementWithDisplays, updateAnnouncementWithDisplays } from '../services/dbService.js';

const router = express.Router();

// GET /api/announcements - List announcements with computed status and assigned screens
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        a.id, a.title, a.body, a.publish_status, a.status, a.starts_at, a.ends_at,
        a.image_url, a.created_by, a.author_name, a.author_department, a.author_position, a.created_at,
        COALESCE(
          json_agg(json_build_object('id', d.id, 'name', d.name)) 
          FILTER (WHERE d.id IS NOT NULL), '[]'
        ) AS assigned_displays
      FROM v_announcements a
      LEFT JOIN announcement_displays ad ON a.id = ad.announcement_id
      LEFT JOIN displays d ON ad.display_id = d.id
      GROUP BY a.id, a.title, a.body, a.publish_status, a.status, a.starts_at, 
               a.ends_at, a.image_url, a.created_by, a.author_name, a.author_department, a.author_position, a.created_at
      ORDER BY a.created_at DESC
    `);
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
    res.json({ announcement: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements - Create new announcement with optional image and screen targeting
router.post('/', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const { title, body, starts_at, ends_at } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let displayIds = [];
    if (req.body.display_ids) {
      try {
        displayIds = typeof req.body.display_ids === 'string'
          ? JSON.parse(req.body.display_ids)
          : req.body.display_ids;
      } catch {
        displayIds = [];
      }
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || null);
    const actorId = req.user?.id || (await query('SELECT id FROM administrator_profiles LIMIT 1')).rows[0]?.id;

    const announcement = await saveAnnouncementWithDisplays(
      {
        title: title.trim(),
        body: body ? body.trim() : null,
        starts_at: starts_at || new Date().toISOString(),
        ends_at: ends_at || new Date(Date.now() + 7 * 86400000).toISOString(),
        image_url: imageUrl,
      },
      displayIds,
      actorId
    );

    res.status(201).json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// PUT /api/announcements/:id - Update existing announcement
router.put('/:id', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const { title, body, starts_at, ends_at } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let displayIds = undefined;
    if (req.body.display_ids !== undefined) {
      try {
        displayIds = typeof req.body.display_ids === 'string'
          ? JSON.parse(req.body.display_ids)
          : req.body.display_ids;
      } catch {
        displayIds = [];
      }
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    const actorId = req.user?.id || (await query('SELECT id FROM administrator_profiles LIMIT 1')).rows[0]?.id;

    const announcement = await updateAnnouncementWithDisplays(
      req.params.id,
      {
        title: title.trim(),
        body: body ? body.trim() : null,
        starts_at: starts_at || new Date().toISOString(),
        ends_at: ends_at || new Date(Date.now() + 7 * 86400000).toISOString(),
        image_url: imageUrl,
      },
      displayIds,
      actorId
    );

    res.json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/announcements/:id - Soft-delete announcement
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await query('UPDATE announcements SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
