import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { requireLeadAdmin } from '../middleware/auth.js';

const router = express.Router();

const VALID_COLLEGES = ['ALL', 'CCS', 'COE', 'CN', 'CLA', 'CTE', 'CBA'];
const ADMIN_COLUMNS = "id, email, full_name, role, department, position, college, allowed_colleges, status, disabled_reason, (status = 'active') AS is_active, created_at";

function normalizeCollegeInput(college, department) {
  const raw = college || department;
  if (!raw) return 'ALL';
  const trimmed = String(raw).trim();
  const upper = trimmed.toUpperCase();
  if (upper === 'ALL' || upper === 'CAMPUS-WIDE') return 'ALL';
  if (VALID_COLLEGES.includes(upper)) return upper;
  return /^[A-Za-z0-9 &.,/_-]{1,60}$/.test(trimmed) ? trimmed : null;
}

// Auto-add the college column if it doesn't exist yet
try {
  await query(
    "ALTER TABLE administrator_profiles ADD COLUMN IF NOT EXISTS college VARCHAR(20) DEFAULT 'ALL'"
  );
} catch (err) {
  console.error('Could not add college column:', err.message);
}

// GET /api/users - List administrators (Lead Admin only)
router.get('/', requireLeadAdmin, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ${ADMIN_COLUMNS} FROM administrator_profiles ORDER BY created_at ASC`
    );
    // `users` is the key the frontend reads; `administrators` is kept for backwards compatibility
    res.json({ users: result.rows, administrators: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Create new administrator (Lead Admin only)
router.post('/', requireLeadAdmin, async (req, res, next) => {
  try {
    const { email, password, full_name, role, department, position, college, allowed_colleges } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const assignedRole = role === 'lead_admin' ? 'lead_admin' : 'admin';
    let assignedCollege = 'ALL';
    let finalList = [];
    let finalDepartmentLabel = 'Campus-Wide';

    if (assignedRole === 'admin') {
      // Enforce 1 Admin = 1 College: take the first valid non-'ALL' college
      const rawList = Array.isArray(allowed_colleges)
        ? allowed_colleges.map((c) => normalizeCollegeInput(c, null)).filter((c) => c && c !== 'ALL')
        : [];
      const rawCollege = normalizeCollegeInput(college, department);
      if (rawCollege === null) {
        return res.status(400).json({ error: 'Invalid college' });
      }
      const single = rawList[0] || (rawCollege && rawCollege !== 'ALL' ? rawCollege : null);
      if (!single) {
        return res.status(400).json({ error: 'A College Admin must be assigned to exactly one college' });
      }
      assignedCollege = single;
      finalList = [single];
      finalDepartmentLabel = single;
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);

    const result = await query(
      `INSERT INTO administrator_profiles (email, password_hash, full_name, role, department, position, college, allowed_colleges, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING ${ADMIN_COLUMNS}`,
      [
        email.trim().toLowerCase(),
        passwordHash,
        full_name.trim(),
        assignedRole,
        department ? department.trim() : finalDepartmentLabel,
        position ? position.trim() : null,
        assignedCollege,
        finalList,
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

const MAX_IMPORT_ROWS = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/users/import - Bulk-create administrators from parsed CSV rows (Lead Admin only)
// Body: { administrators: [{ email, full_name, password, role?, college?, department?, position? }] }
// Existing emails are skipped (ON CONFLICT DO NOTHING); invalid rows are reported in `errors`.
router.post('/import', requireLeadAdmin, async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.administrators) ? req.body.administrators : req.body?.users;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'administrators must be a non-empty array' });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({ error: `Import is limited to ${MAX_IMPORT_ROWS} administrators at a time` });
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const fail = (message) => errors.push({ row: rowNumber, email: row?.email ? String(row.email) : null, error: message });

      if (!row || typeof row !== 'object') {
        fail('Row must be an object');
        continue;
      }

      const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
      const fullName = typeof row.full_name === 'string' ? row.full_name.trim() : '';
      const password = typeof row.password === 'string' ? row.password.trim() : '';

      if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
        fail('Invalid email');
        continue;
      }
      if (!fullName || fullName.length > 150) {
        fail('full_name is required (max 150 characters)');
        continue;
      }
      if (password.length < 6 || password.length > 72) {
        fail('password must be 6-72 characters');
        continue;
      }

      const rawRole = row.role === undefined || row.role === null || row.role === ''
        ? 'admin'
        : String(row.role).trim().toLowerCase();
      const roleValue = rawRole === 'college_admin' ? 'admin' : rawRole;
      if (!['admin', 'lead_admin'].includes(roleValue)) {
        fail("role must be 'admin', 'college_admin', or 'lead_admin'");
        continue;
      }

      const requestedCollege = normalizeCollegeInput(row.college, row.department);
      if (requestedCollege === null) {
        fail('Invalid college');
        continue;
      }
      const college = roleValue === 'lead_admin' ? 'ALL' : requestedCollege;

      const department = row.department ? String(row.department).trim() : '';
      const position = row.position ? String(row.position).trim() : '';
      if (department.length > 100 || position.length > 100) {
        fail('department and position must be at most 100 characters');
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await query(
          `INSERT INTO administrator_profiles (email, password_hash, full_name, role, department, position, college, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [email, passwordHash, fullName, roleValue, department || null, position || null, college]
        );
        if (result.rows.length > 0) created++;
        else skipped++;
      } catch (err) {
        console.error('Admin import row failed:', err.message);
        fail('Could not save this administrator');
      }
    }

    res.status(created > 0 ? 201 : 200).json({ success: true, created, skipped, errors });
  } catch (err) {
    next(err);
  }
});

// Shared handler: set an administrator's account status ('active' | 'disabled')
async function setAccountStatus(req, res, next, status) {
  try {
    const { id } = req.params;

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'disabled'" });
    }

    // Prevent disabling own account
    if (id === req.user.id && status === 'disabled') {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    const rawReason = req.body?.disabled_reason ?? req.body?.reason;
    const disabledReason = status === 'disabled'
      ? (typeof rawReason === 'string' && rawReason.trim() ? rawReason.trim().slice(0, 300) : null)
      : null;

    const result = await query(
      `UPDATE administrator_profiles
       SET status = $1, disabled_reason = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING ${ADMIN_COLUMNS}`,
      [status, disabledReason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    res.json({ success: true, administrator: result.rows[0], user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/scopes - Update single-college scope assignment (Lead Admin only)
router.patch('/:id/scopes', requireLeadAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id, role FROM administrator_profiles WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    let finalList = [];
    let primary = 'ALL';
    let departmentLabel = 'Campus-Wide';

    if (existing.rows[0].role !== 'lead_admin') {
      // Enforce 1 Admin = 1 College: take the first valid non-'ALL' college
      const rawList = Array.isArray(req.body?.allowed_colleges)
        ? req.body.allowed_colleges.map((c) => normalizeCollegeInput(c, null)).filter((c) => c && c !== 'ALL')
        : [];
      const rawCollege = req.body?.college !== undefined ? normalizeCollegeInput(req.body.college, null) : undefined;
      if (rawCollege === null) {
        return res.status(400).json({ error: 'Invalid college' });
      }
      const single = rawList[0] || (rawCollege && rawCollege !== 'ALL' ? rawCollege : null);
      if (!single) {
        return res.status(400).json({ error: 'A College Admin must be assigned to exactly one college' });
      }
      finalList = [single];
      primary = single;
      departmentLabel = single;
    }

    const result = await query(
      `UPDATE administrator_profiles
       SET allowed_colleges = $1, college = $2, department = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING ${ADMIN_COLUMNS}`,
      [finalList, primary, departmentLabel, id]
    );
    res.json({ success: true, administrator: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Reject/remove a pending administrator request (Lead Admin only)
router.delete('/:id', requireLeadAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const result = await query('DELETE FROM administrator_profiles WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Administrator not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/status - Toggle account status ({ status: 'active' | 'disabled' })
router.patch('/:id/status', requireLeadAdmin, (req, res, next) =>
  setAccountStatus(req, res, next, req.body.status)
);

// PATCH /api/users/:id - Toggle account status via ({ is_active: boolean })
router.patch('/:id', requireLeadAdmin, (req, res, next) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean' });
  }
  return setAccountStatus(req, res, next, is_active ? 'active' : 'disabled');
});

export default router;
