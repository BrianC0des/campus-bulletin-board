import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/announcements - List announcements with computed status
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM v_announcements ORDER BY created_at DESC');
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

// POST /api/announcements - Create new announcement
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { title, body, starts_at, ends_at } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await query(
      `INSERT INTO announcements (title, body, starts_at, ends_at, created_by)
       VALUES ($1, $2, $3, $4, (SELECT id FROM administrator_profiles LIMIT 1))
       RETURNING *`,
      [title, body || null, starts_at || new Date(), ends_at || new Date(Date.now() + 7 * 86400000)]
    );

    res.status(201).json({ success: true, announcement: result.rows[0] });
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
