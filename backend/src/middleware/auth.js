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
    // TODO: Verify JWT token with Supabase and check account_status = 'active'
    
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Display credential verification middleware (via cookie or header)
 */
export async function requireDisplayCredential(req, res, next) {
  try {
    // TODO: Verify display opaque credential hash against display_credentials
    next();
  } catch (err) {
    next(err);
  }
}
