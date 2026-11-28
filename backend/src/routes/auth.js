import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { requireAdmin, signAuthToken } from '../middleware/auth.js';

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Administrator login verification
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, email, password_hash, full_name, role, department, position, college, allowed_colleges, status FROM administrator_profiles WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const admin = result.rows[0];

    if (admin.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending approval by the Lead Campus Administrator.' });
    }
    if (admin.status === 'disabled') {
      return res.status(403).json({ error: 'Account is disabled. Please contact the Lead Administrator.' });
    }

    const isMatch = await bcrypt.compare(password.trim(), admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const allowedColleges = Array.isArray(admin.allowed_colleges) && admin.allowed_colleges.length > 0
      ? admin.allowed_colleges
      : (admin.college && admin.college !== 'ALL' ? [admin.college] : []);

    const userProfile = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      department: admin.department || null,
      position: admin.position || null,
      college: admin.college || 'ALL',
      allowed_colleges: allowedColleges,
      status: admin.status,
    };

    const token = signAuthToken(admin.id);
    res.json({ success: true, token, user: userProfile });
  } catch (err) {
    next(err);
  }
});

// Self-service sign up (creates a pending account for Lead Admin approval)
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, college, position } = req.body;
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanName = typeof full_name === 'string' ? full_name.trim() : '';
    const cleanPass = typeof password === 'string' ? password.trim() : '';

    if (!cleanName || !cleanEmail || !cleanPass) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid institutional email address' });
    }
    if (cleanPass.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const requestedCollege = college ? String(college).trim().toUpperCase() : 'ALL';
    const allowedColleges = requestedCollege === 'ALL' || requestedCollege === 'CAMPUS-WIDE'
      ? []
      : [requestedCollege];

    const passwordHash = await bcrypt.hash(cleanPass, 10);
    await query(
      `INSERT INTO administrator_profiles (email, password_hash, full_name, role, department, position, college, allowed_colleges, status)
       VALUES ($1, $2, $3, 'admin', $4, $5, $6, $7, 'pending')`,
      [
        cleanEmail,
        passwordHash,
        cleanName,
        requestedCollege,
        position ? String(position).trim().slice(0, 100) : 'College Coordinator',
        requestedCollege === 'CAMPUS-WIDE' ? 'ALL' : requestedCollege,
        allowedColleges,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Account request submitted. A Lead Campus Administrator will review and approve your access.',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'This email is already registered' });
    }
    next(err);
  }
});

// Update current administrator's profile display name
router.put('/profile', requireAdmin, async (req, res, next) => {
  try {
    const cleanName = typeof req.body?.full_name === 'string' ? req.body.full_name.trim() : '';
    if (!cleanName) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    const result = await query(
      `UPDATE administrator_profiles
       SET full_name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, full_name, role, department, position, college, allowed_colleges, status`,
      [cleanName.slice(0, 120), req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Administrator profile not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Current session profile (fresh scope/role from DB, same shape as login)
router.get('/me', requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, department, position, college, allowed_colleges, status FROM administrator_profiles WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Administrator profile not found' });
    }
    const admin = result.rows[0];
    const allowedColleges = Array.isArray(admin.allowed_colleges) && admin.allowed_colleges.length > 0
      ? admin.allowed_colleges
      : (admin.college && admin.college !== 'ALL' ? [admin.college] : []);

    const user = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      department: admin.department || null,
      position: admin.position || null,
      college: admin.college || 'ALL',
      allowed_colleges: allowedColleges,
      status: admin.status,
    };

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
