import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

// POST /api/pairing/code - Display requests code
router.post('/code', async (req, res, next) => {
  try {
    const code = '7K4P-92QM';
    res.json({ pairingCode: code, expiresInSeconds: 600 });
  } catch (err) {
    next(err);
  }
});

export default router;
