import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/pairing/code - Display requests an 8-character pairing code and saves it to DB
router.post('/code', async (req, res, next) => {
  try {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Clean up old unclaimed pairing codes older than 10 minutes
    await query("DELETE FROM displays WHERE is_paired = FALSE AND created_at < NOW() - INTERVAL '10 minutes'");

    // Save the code in DB so the live screen can later check pairing status
    await query(
      `INSERT INTO displays (pairing_code, is_paired)
       VALUES ($1, FALSE)
       ON CONFLICT (pairing_code) DO NOTHING`,
      [code]
    );
    res.json({ pairingCode: code, expiresInSeconds: 600 });
  } catch (err) {
    next(err);
  }
});

// GET /api/pairing/status?code=XXXX-XXXX - Check if a pairing code has been claimed
router.get('/status', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code is required' });
    const result = await query(
      'SELECT id, name, location, is_paired FROM displays WHERE pairing_code = $1',
      [code]
    );
    if (result.rows.length === 0) return res.json({ found: false, isPaired: false });
    const display = result.rows[0];
    res.json({ found: true, isPaired: display.is_paired, displayId: display.id, name: display.name });
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

    const display = result.rows[0];

    // Auto-link active published announcements to this newly paired display
    const actorId = req.user?.id || (await query('SELECT id FROM administrator_profiles LIMIT 1')).rows[0]?.id;
    await query(
      `INSERT INTO announcement_displays (announcement_id, display_id, assigned_by)
       SELECT id, $1, $2
       FROM announcements
       WHERE deleted_at IS NULL AND publish_status = 'published' AND CURRENT_TIMESTAMP < ends_at
       ON CONFLICT DO NOTHING`,
      [display.id, actorId]
    );

    res.json({ success: true, message: 'Display paired successfully', display });
  } catch (err) {
    next(err);
  }
});

export default router;
