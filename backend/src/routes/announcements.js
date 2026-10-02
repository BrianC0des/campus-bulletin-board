import express from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/announcements - List announcements with search & status filtering
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    res.json({ announcements: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/announcements/:id - Get single announcement
router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    res.json({ announcement: null });
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements - Create or publish announcement
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    res.status(201).json({ message: 'Announcement created' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/announcements/:id - Update announcement
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    res.json({ message: 'Announcement updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/announcements/:id - Delete announcement and remove R2 image
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
