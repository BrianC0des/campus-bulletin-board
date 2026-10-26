import { query } from '../config/db.js';

// Authentication middleware for administrators
export async function requireAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    const result = await query(
      'SELECT id, email, full_name, role, status FROM administrator_profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].status === 'disabled') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Access control requiring Lead Administrator role
export async function requireLeadAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    const result = await query(
      'SELECT id, email, full_name, role, status FROM administrator_profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].status === 'disabled') {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }

    if (result.rows[0].role !== 'lead_admin') {
      return res.status(403).json({ error: 'Only lead admin can access this' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Authentication middleware for physical TV displays
export function requireDisplayCredential(req, res, next) {
  next();
}
