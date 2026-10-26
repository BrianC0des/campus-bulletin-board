import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { requireLeadAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - List administrators (Lead Admin only)
router.get('/', requireLeadAdmin, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, department, position, status, created_at FROM administrator_profiles ORDER BY created_at ASC'
    );
    res.json({ administrators: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Create new administrator (Lead Admin only)
router.post('/', requireLeadAdmin, async (req, res, next) => {
  try {
    const { email, password, full_name, role, department, position } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const assignedRole = role === 'lead_admin' ? 'lead_admin' : 'admin';
    const passwordHash = await bcrypt.hash(password.trim(), 10);

    const result = await query(
      `INSERT INTO administrator_profiles (email, password_hash, full_name, role, department, position, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, email, full_name, role, department, position, status, created_at`,
      [
        email.trim().toLowerCase(),
        passwordHash,
        full_name.trim(),
        assignedRole,
        department ? department.trim() : null,
        position ? position.trim() : null,
      ]
    );

    res.status(201).json({ success: true, administrator: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'This email is already registered' });
    }
    next(err);
  }
});

// PATCH /api/users/:id/status - Toggle account status ('active' | 'disabled')
router.patch('/:id/status', requireLeadAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'disabled'" });
    }

    // Prevent disabling own account
    if (id === req.user.id && status === 'disabled') {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    const result = await query(
      `UPDATE administrator_profiles
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, full_name, role, department, position, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    res.json({ success: true, administrator: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
