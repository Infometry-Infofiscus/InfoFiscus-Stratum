/**
 * errorHandler.js — catches anything unhandled, always returns JSON.
 * This is the safety net that prevents the "A server error has occurred"
 * HTML page from ever reaching the frontend.
 */
export function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}
