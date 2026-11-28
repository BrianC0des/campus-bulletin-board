import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { allowedColleges, canAccessCollege, normalizeCollege, normalizeDepartment } from '../utils/scope.js';

const router = express.Router();

// Codes look like ABCD-EFGH (9 chars); allow up to 10 chars of A-Z, 0-9 and dashes.
const PAIRING_CODE_RE = /^[A-Z0-9-]{1,10}$/;

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
    if (display.is_paired) {
      await query('UPDATE displays SET is_online = TRUE, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [display.id]);
    }
    res.json({ found: true, isPaired: display.is_paired, displayId: display.id, name: display.name, displayName: display.name });
  } catch (err) {
    next(err);
  }
});

// POST /api/pairing/pair - Administrator pairs an unregistered display
router.post('/pair', requireAdmin, async (req, res, next) => {
  try {
    const { code, name, location, department } = req.body || {};
    if (!code || !name) {
      return res.status(400).json({ error: 'Pairing code and name are required' });
    }
    if (typeof code !== 'string' || typeof name !== 'string') {
      return res.status(400).json({ error: 'Pairing code and name must be text' });
    }

    const pairingCode = code.trim().toUpperCase();
    if (!PAIRING_CODE_RE.test(pairingCode)) {
      return res.status(400).json({ error: 'Invalid pairing code format' });
    }
    const displayName = name.trim();
    if (!displayName) {
      return res.status(400).json({ error: 'Pairing code and name are required' });
    }

    // Scope: lead admins are unrestricted; everyone else may only pair into their own colleges.
    // A blank department defaults to the admin's own college (or Campus-Wide when unscoped).
    const allowed = allowedColleges(req.user);
    let requestedDept;
    if (department !== undefined && department !== null && String(department).trim() !== '') {
      requestedDept = normalizeDepartment(department);
    } else if (!allowed) {
      requestedDept = normalizeDepartment('');
    } else {
      const own = normalizeCollege(req.user.college);
      const fallback = allowed.includes(own) ? own : allowed.find((c) => c !== 'ALL') || (allowed.includes('ALL') ? 'ALL' : null);
      if (!fallback) {
        return res.status(403).json({ error: 'Cannot pair a display outside your college scope' });
      }
      requestedDept = normalizeDepartment(fallback);
    }
    if (!canAccessCollege(req.user, requestedDept)) {
      return res.status(403).json({ error: 'Cannot pair a display outside your college scope' });
    }

    // Only an unclaimed, unexpired code can be paired; never create or overwrite a row here.
    const result = await query(
      `UPDATE displays
       SET name = $1, location = $2, department = $3, is_paired = TRUE, paired_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE pairing_code = $4 AND is_paired = FALSE AND created_at > NOW() - INTERVAL '10 minutes'
       RETURNING *`,
      [displayName, location ? String(location).trim() || null : null, requestedDept, pairingCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pairing code not found, expired, or already used' });
    }

    const display = result.rows[0];

    // Newly paired displays start empty: announcements are only shown once explicitly assigned to them
    res.json({ success: true, message: 'Display paired successfully', display });
  } catch (err) {
    next(err);
  }
});

export default router;
