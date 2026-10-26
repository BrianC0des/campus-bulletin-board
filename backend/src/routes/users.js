import express from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - List administrators
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    res.json({ administrators: [] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/status - Toggle account status ('active' | 'disabled')
router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    res.json({ message: 'User status updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
