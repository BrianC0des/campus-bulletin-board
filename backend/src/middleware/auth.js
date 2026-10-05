/**
 * Simple Administrator authentication middleware
 * Checks if the request contains an authenticated user ID header
 */
export async function requireAdmin(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    
    // In simple auth, the client passes their logged-in user ID
    if (!userId) {
      return res.status(401).json({ error: 'Administrator login required' });
    }

    req.user = { id: userId };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Display credential verification middleware
 */
export async function requireDisplayCredential(req, res, next) {
  try {
    const displayId = req.headers['x-display-id'] || req.query.display_id;
    if (!displayId) {
      return res.status(401).json({ error: 'Display identifier required' });
    }
    next();
  } catch (err) {
    next(err);
  }
}
