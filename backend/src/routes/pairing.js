import express from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/pairing/code - Display requests an 8-character pairing code
router.post('/code', async (req, res, next) => {
  try {
    res.json({ pairingCode: 'XXXX-YYYY', expiresInSeconds: 600 });
  } catch (err) {
    next(err);
  }
});

// POST /api/pairing/pair - Administrator pairs an unregistered display
router.post('/pair', requireAdmin, async (req, res, next) => {
  try {
    res.json({ message: 'Display paired successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/pairing/reregister - Administrator re-registers an existing display
router.post('/reregister', requireAdmin, async (req, res, next) => {
  try {
    res.json({ message: 'Display re-registered successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
