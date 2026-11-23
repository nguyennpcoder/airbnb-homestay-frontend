/**
 * Image URL resolver.
 *
 * Production note (Nov 2026): Supabase Storage project hit `exceed_egress_quota`
 * (HTTP 402), so absolute Supabase URLs render as broken/black images.
 * We therefore serve `/uploads/...` from the same origin (Vercel `public/uploads`
 * or the `/uploads` rewrite → Render) and only use Supabase when explicitly enabled.
 */

const RENDER_BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
  'https://airbnb-homestay-9ga1.onrender.com';

function resolveBackendOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed || trimmed === '/api') continue;

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        // NEXT_PUBLIC_API_URL may be ".../api" — strip the path.
        return url.origin;
      } catch {
        continue;
      }
    }
  }

  return RENDER_BACKEND;
}

const BACKEND_ORIGIN = resolveBackendOrigin();

const SUPABASE_UPLOADS_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_UPLOADS_URL ||
  'https://ksjzpphvbpkayfmarpeb.supabase.co/storage/v1/object/public/uploads'
).replace(/\/$/, '');

/**
 * `same-origin` (default) — `/uploads/...` via Vercel public folder / rewrite.
 * `supabase` — absolute Supabase Storage URLs (only when quota is healthy).
 * `backend` — absolute Render backend URLs.
 */
const IMAGE_SOURCE = (
  process.env.NEXT_PUBLIC_IMAGE_SOURCE ||
  'same-origin'
).toLowerCase();

function toSupabaseUploadsUrl(uploadsPath: string): string {
  const rest = uploadsPath.replace(/^\/uploads\//, '');
  const encoded = rest
    .split('/')
    .map((segment) => {
      let value = segment;
      try {
        value = decodeURIComponent(segment);
      } catch {
        // keep original segment
      }
      return encodeURIComponent(value);
    })
    .join('/');
  return `${SUPABASE_UPLOADS_URL}/${encoded}`;
}

function toBackendUploadsUrl(uploadsPath: string): string {
  return `${BACKEND_ORIGIN}${uploadsPath}`;
}

/** Normalize any absolute/relative uploads URL down to `/uploads/...`. */
function extractUploadsPath(src: string): string | null {
  if (!src) return null;

  // Already a relative uploads path.
  if (src.startsWith('/uploads/')) return src;

  // Absolute URL whose path is /uploads/...
  const absoluteMatch = src.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/i);
  if (absoluteMatch) return absoluteMatch[1];

  // Supabase public object URL → rebuild as /uploads/<rest>
  const supabaseMatch = src.match(
    /\/storage\/v1\/object\/public\/uploads\/(.+)$/i
  );
  if (supabaseMatch) {
    let rest = supabaseMatch[1];
    try {
      rest = decodeURIComponent(rest);
    } catch {
      // keep encoded rest
    }
    return `/uploads/${rest}`;
  }

  return null;
}

/** Absolute Render URL — used as BackendImage failover. */
export function getBackendUploadsSrc(src: unknown): string | null {
  if (!src || typeof src !== 'string') return null;
  const uploadsPath = extractUploadsPath(src);
  return uploadsPath ? toBackendUploadsUrl(uploadsPath) : null;
}

/** Absolute Supabase URL — optional tertiary failover when enabled. */
export function getSupabaseUploadsSrc(src: unknown): string | null {
  if (!src || typeof src !== 'string') return null;
  const uploadsPath = extractUploadsPath(src);
  return uploadsPath ? toSupabaseUploadsUrl(uploadsPath) : null;
}

/**
 * Resolve a DB/API image path into a browser-usable src.
 * Prefer same-origin `/uploads/...` so Vercel CDN serves files from public/.
 */
export function getValidSrc(src: unknown, fallback = '/placeholder.jpg'): string {
  if (!src || typeof src !== 'string' || src === 'FILE_SELECTED' || src.trim() === '') {
    return fallback;
  }

  const trimmed = src.trim();
  const uploadsPath = extractUploadsPath(trimmed);

  if (uploadsPath) {
    if (IMAGE_SOURCE === 'supabase') {
      return toSupabaseUploadsUrl(uploadsPath);
    }
    if (IMAGE_SOURCE === 'backend') {
      return toBackendUploadsUrl(uploadsPath);
    }
    // default: same-origin (Vercel public/uploads or rewrite → Render)
    return uploadsPath;
  }

  // Data URLs / external CDNs / ui-avatars — pass through.
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  // Bare relative path without leading slash.
  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  return trimmed.startsWith('/') ? trimmed : fallback;
}
