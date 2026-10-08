import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

// POST /api/pairing/code - Display requests 8-char code
router.post('/code', async (req, res, next) => {
  try {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    res.json({ pairingCode: code, expiresInSeconds: 600 });
  } catch (err) {
    next(err);
  }
});

export default router;
