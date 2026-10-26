import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin, requireDisplayCredential } from '../middleware/auth.js';

const router = express.Router();

// GET /api/displays - List all registered campus displays
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM displays WHERE is_paired = TRUE ORDER BY created_at DESC');
    res.json({ displays: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/displays/active-content - Slide feed for physical display screens
router.get('/active-content', requireDisplayCredential, async (req, res, next) => {
  try {
    const { display_id } = req.query;
    let queryText = `
      SELECT DISTINCT ON (a.id)
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
        AND d.is_paired = TRUE
    `;
    const params = [];

    if (display_id) {
      queryText += ' AND ad.display_id = $1';
      params.push(display_id);
    }

    queryText += ' ORDER BY a.id, a.created_at DESC';

    const result = await query(queryText, params);
    res.json({
      rotationSeconds: 10,
      announcements: result.rows,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/displays/:id - Fully remove a display record
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM displays WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Display removed' });
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/:id/unregister - Unpair a display (kept for backwards compat)
router.post('/:id/unregister', requireAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM displays WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Display unlinked and removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
