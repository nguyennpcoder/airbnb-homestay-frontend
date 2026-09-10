const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';

export function getValidSrc(src: unknown, fallback = '/placeholder.jpg'): string {
  if (!src || typeof src !== 'string' || src === 'FILE_SELECTED' || src.trim() === '') {
    return fallback;
  }

  // Convert absolute URLs from backend (e.g. http://localhost:8088/uploads/...)
  // to the production backend URL so images load directly without rewrites.
  const uploadsMatch = src.match(/^https?:\/\/[^/]+(\/uploads\/.*)$/);
  if (uploadsMatch) {
    const uploadsPath = uploadsMatch[1];
    // If we have a backend URL, use it; otherwise return relative path
    return BACKEND_URL ? `${BACKEND_URL}${uploadsPath}` : uploadsPath;
  }

  return src;
}
