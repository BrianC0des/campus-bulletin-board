import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Simple authentication: checks if email and password match a row in administrator_profiles
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, email, full_name, role FROM administrator_profiles WHERE email = $1 AND password = $2',
      [email.trim().toLowerCase(), password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
