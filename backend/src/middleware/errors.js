/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
}
