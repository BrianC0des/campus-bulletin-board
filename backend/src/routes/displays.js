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
    const result = await query('SELECT * FROM v_kiosk_active_announcements');
    res.json({
      rotationSeconds: 10,
      announcements: result.rows,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/:id/unregister - Unpair a display
router.post('/:id/unregister', requireAdmin, async (req, res, next) => {
  try {
    await query('UPDATE displays SET is_paired = FALSE, pairing_code = NULL WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Display unlinked' });
  } catch (err) {
    next(err);
  }
});

export default router;
