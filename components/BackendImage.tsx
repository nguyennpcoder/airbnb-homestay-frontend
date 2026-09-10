'use client';

import Image, { ImageProps } from 'next/image';
import { getValidSrc } from '@/lib/image';

/**
 * Wrapper around Next.js <Image> that automatically sets `unoptimized`
 * for /uploads/ paths (images served from the backend).
 *
 * Next.js Image Optimization cannot fetch from backend rewrites,
 * so backend images must bypass the optimization pipeline.
 */
export default function BackendImage({
  src,
  alt,
  fallback = '/placeholder.jpg',
  ...props
}: Omit<ImageProps, 'src'> & { src: unknown; fallback?: string }) {
  const resolvedSrc = getValidSrc(src, fallback);
  const isBackendUpload = typeof resolvedSrc === 'string' && resolvedSrc.startsWith('/uploads/');

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      unoptimized={isBackendUpload || props.unoptimized}
      {...props}
    />
  );
}
