const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';

export function getValidSrc(src: unknown, fallback = '/placeholder.jpg'): string {
  if (!src || typeof src !== 'string' || src === 'FILE_SELECTED' || src.trim() === '') {
    return fallback;
  }

  // Absolute URL with /uploads/ (e.g. http://localhost:8089/uploads/...)
  const uploadsMatch = src.match(/^https?:\/\/[^/]+(\/uploads\/.*)$/);
  if (uploadsMatch) {
    const uploadsPath = uploadsMatch[1];
    return BACKEND_URL ? `${BACKEND_URL}${uploadsPath}` : uploadsPath;
  }

  // Relative /uploads/ path (e.g. /uploads/product/xxx.avif)
  // Prepend backend URL so browser fetches directly, not via Next.js Image Optimization
  if (src.startsWith('/uploads/')) {
    return BACKEND_URL ? `${BACKEND_URL}${src}` : src;
  }

  return src;
}
