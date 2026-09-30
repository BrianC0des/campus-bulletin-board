import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/announcements - List announcements
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM v_announcements ORDER BY created_at DESC');
    res.json({ announcements: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
