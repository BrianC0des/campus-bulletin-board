import express from 'express';
import { requireAdmin, requireDisplayCredential } from '../middleware/auth.js';

const router = express.Router();

// GET /api/displays - List all campus displays (Admin only)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    res.json({ displays: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/displays/active-content - Real-time polling endpoint for physical display screens
router.get('/active-content', requireDisplayCredential, async (req, res, next) => {
  try {
    res.json({
      display: null,
      rotationSeconds: 10,
      announcements: [],
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/:id/unregister - Unregister a display
router.post('/:id/unregister', requireAdmin, async (req, res, next) => {
  try {
    res.json({ message: 'Display unregistered' });
  } catch (err) {
    next(err);
  }
});

export default router;
