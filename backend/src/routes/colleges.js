import express from 'express';
import { query } from '../config/db.js';
import { requireAdmin, requireLeadAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { canAccessCollege, RESERVED_COLLEGE_CODES } from '../utils/scope.js';

const router = express.Router();

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{1,29}$/;

// GET /api/colleges - List all configured colleges / departments
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, code, name, category, logo_url, created_at FROM colleges ORDER BY category ASC, code ASC'
    );
    res.json({ colleges: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/colleges - Add or update a college / department (Admin)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const rawCode = String(req.body?.code || '').trim().toUpperCase().replace(/\s+/g, '-');
    const name = String(req.body?.name || '').trim();
    const category = String(req.body?.category || 'Academic Colleges').trim().slice(0, 50) || 'Academic Colleges';

    if (!CODE_RE.test(rawCode)) {
      return res.status(400).json({ error: 'Code must be 2–30 uppercase letters, numbers, or dashes (e.g. CAIS)' });
    }
    if (RESERVED_COLLEGE_CODES.includes(rawCode)) {
      return res.status(400).json({ error: `'${rawCode}' is a reserved code and cannot be used for a college/department` });
    }
    if (name.length < 2 || name.length > 150) {
      return res.status(400).json({ error: 'College/department name must be 2–150 characters' });
    }

    const result = await query(
      `INSERT INTO colleges (code, name, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
       RETURNING id, code, name, category, logo_url, created_at`,
      [rawCode, name, category]
    );
    res.status(201).json({ success: true, college: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/colleges/:code/logo - Upload or replace a college/department logo
router.post('/:code/logo', requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }]), async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!CODE_RE.test(code) || RESERVED_COLLEGE_CODES.includes(code)) {
      return res.status(400).json({ error: 'Invalid college code' });
    }
    if (!canAccessCollege(req.user, code)) {
      return res.status(403).json({ error: 'You do not have access to update this college logo' });
    }
    const urls = req.files?.uploadedUrls || [];
    const logoUrl = urls[0];
    if (!logoUrl) {
      return res.status(400).json({ error: 'Logo image file is required' });
    }
    const result = await query(
      `UPDATE colleges SET logo_url = $1 WHERE code = $2
       RETURNING id, code, name, category, logo_url, created_at`,
      [logoUrl, code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }
    res.json({ success: true, college: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/colleges/:code/logo - Remove a college/department logo
router.delete('/:code/logo', requireAdmin, async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!CODE_RE.test(code) || RESERVED_COLLEGE_CODES.includes(code)) {
      return res.status(400).json({ error: 'Invalid college code' });
    }
    if (!canAccessCollege(req.user, code)) {
      return res.status(403).json({ error: 'You do not have access to remove this college logo' });
    }
    const result = await query(
      `UPDATE colleges SET logo_url = NULL WHERE code = $1
       RETURNING id, code, name, category, logo_url, created_at`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }
    res.json({ success: true, college: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/colleges/:id - Remove a college / department (Lead Admin)
router.delete('/:id', requireLeadAdmin, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM colleges WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
