/**
 * Normalizes image paths to full URLs pointing to the backend uploads server
 */
export function getImageUrl(path) {
  if (!path) return null;
  // If it's already an absolute URL or blob/data URL from local file selection
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendBase}${cleanPath}`;
}
