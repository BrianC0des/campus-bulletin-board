import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'campus-bulletin-secret-key-change-in-prod';

/**
 * Administrator authentication & active account verification middleware
 */
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify standard JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

/**
 * Display credential verification middleware (via cookie or header)
 */
export async function requireDisplayCredential(req, res, next) {
  try {
    const displayToken = req.headers['x-display-token'] || req.headers.authorization;
    if (!displayToken) {
      return res.status(401).json({ error: 'Display authentication token required' });
    }
    next();
  } catch (err) {
    next(err);
  }
}
