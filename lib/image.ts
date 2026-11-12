const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';

const SUPABASE_UPLOADS_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_UPLOADS_URL ||
  'https://ksjzpphvbpkayfmarpeb.supabase.co/storage/v1/object/public/uploads'
).replace(/\/$/, '');

/**
 * Chuyển một đường dẫn /uploads/... (tương đối hoặc tuyệt đối) sang URL
 * public của Supabase Storage. Các ảnh cũ vẫn giữ nguyên path trong DB,
 * chỉ đổi nơi phục vụ file nên không cần sửa dữ liệu.
 */
function toSupabaseUploadsUrl(uploadsPath: string): string {
  const rest = uploadsPath.replace(/^\/uploads\//, '');
  const encoded = rest
    .split('/')
    .map((segment) => {
      // DB có thể lưu path đã encode sẵn; decode rồi encode lại để tránh %25.
      let value = segment;
      try {
        value = decodeURIComponent(segment);
      } catch {
        // giữ nguyên nếu không decode được
      }
      return encodeURIComponent(value);
    })
    .join('/');
  return `${SUPABASE_UPLOADS_URL}/${encoded}`;
}

/** Tách path /uploads/... từ URL tuyệt đối hoặc path tương đối. */
function extractUploadsPath(src: string): string | null {
  const absoluteMatch = src.match(/^https?:\/\/[^/]+(\/uploads\/.*)$/);
  if (absoluteMatch) return absoluteMatch[1];
  if (src.startsWith('/uploads/')) return src;
  return null;
}

/**
 * URL dự phòng trên backend cũ (Render). Dùng khi ảnh chưa có trên Supabase,
 * ví dụ ảnh mới upload sau khi deploy (backend đang ghi ra disk tạm).
 */
export function getBackendUploadsSrc(src: unknown): string | null {
  if (!BACKEND_URL || !src || typeof src !== 'string') return null;
  const uploadsPath = extractUploadsPath(src);
  return uploadsPath ? `${BACKEND_URL}${uploadsPath}` : null;
}

export function getValidSrc(src: unknown, fallback = '/placeholder.jpg'): string {
  if (!src || typeof src !== 'string' || src === 'FILE_SELECTED' || src.trim() === '') {
    return fallback;
  }

  const uploadsPath = extractUploadsPath(src);
  if (uploadsPath) {
    return toSupabaseUploadsUrl(uploadsPath);
  }

  return src;
}
