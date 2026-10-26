import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin, requireDisplayCredential } from '../middleware/auth.js';

const router = express.Router();

// GET /api/displays - List all campus displays
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM displays ORDER BY created_at DESC');
    res.json({ displays: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/displays/active-content - Slide feed for physical display screens
router.get('/active-content', requireDisplayCredential, async (req, res, next) => {
  try {
    const { display_id } = req.query;
    let queryText = 'SELECT * FROM v_display_screen_announcements';
    const params = [];

    if (display_id) {
      queryText += ' WHERE display_id = $1';
      params.push(display_id);
    }

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
