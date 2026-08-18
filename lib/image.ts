export function getValidSrc(src: unknown, fallback = '/placeholder.jpg'): string {
  if (!src || typeof src !== 'string' || src === 'FILE_SELECTED' || src.trim() === '') {
    return fallback;
  }
  
  // Convert absolute URLs from backend (e.g. http://localhost:8088/uploads/...)
  // to relative paths (/uploads/...) to leverage Next.js rewrites and avoid
  // issues with hardcoded hostnames.
  const uploadsMatch = src.match(/^https?:\/\/[^/]+(\/uploads\/.*)$/);
  if (uploadsMatch) {
    return uploadsMatch[1];
  }
  
  return src;
}
