import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

const router = express.Router();

// Administrator login verification
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, email, password_hash, full_name, role, department, position, status FROM administrator_profiles WHERE email = $1',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const admin = result.rows[0];

    // Check account status
    if (admin.status === 'disabled') {
      return res.status(403).json({ error: 'Account is disabled. Please contact the Lead Administrator.' });
    }

    // Compare bcrypt password hash
    const isMatch = await bcrypt.compare(password.trim(), admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userProfile = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      department: admin.department || null,
      position: admin.position || null,
      status: admin.status,
    };

    res.json({ success: true, user: userProfile });
  } catch (err) {
    next(err);
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
