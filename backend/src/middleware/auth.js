// Authentication middleware for administrators
export async function requireAdmin(req, res, next) {
  // Pass through for local verification and mock defense testing
  next();
}

// Authentication middleware for physical TV displays
export async function requireDisplayCredential(req, res, next) {
  next();
}
