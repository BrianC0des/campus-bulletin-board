const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Shared route-param guard: returns 400 for malformed UUIDs instead of letting
 * Postgres throw (which surfaced as a 500).
 * Usage: router.get('/:id', validateUuidParam('id'), handler)
 */
export function validateUuidParam(...names) {
  const paramNames = names.length > 0 ? names : ['id'];
  return (req, res, next) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value !== undefined && !isUuid(value)) {
        return res.status(400).json({ error: `Invalid ${name}` });
      }
    }
    next();
  };
}

/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Postgres 22P02 = invalid_text_representation (e.g. a malformed UUID reached a query): client error, not a crash
  if (err && err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid identifier or value' });
  }

  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
}
