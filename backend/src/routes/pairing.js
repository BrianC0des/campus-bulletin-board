import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/pairing/code - Display requests an 8-character pairing code
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

// POST /api/pairing/pair - Administrator pairs an unregistered display
router.post('/pair', requireAdmin, async (req, res, next) => {
  try {
    const { code, name, location } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Pairing code and name are required' });
    }

    const result = await query(
      `INSERT INTO displays (name, location, pairing_code, is_paired, paired_at)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (pairing_code) DO UPDATE
       SET name = EXCLUDED.name, location = EXCLUDED.location, is_paired = TRUE, paired_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name, location || null, code]
    );

    res.json({ success: true, message: 'Display paired successfully', display: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
