'use client';

import { useEffect, useState } from 'react';
import { getBackendUploadsSrc, getValidSrc } from '@/lib/image';

/**
 * Renders backend-hosted images as plain <img> to bypass
 * next/image's Image optimization pipeline which causes
 * "Failed to construct 'Image'" errors on Vercel.
 *
 * All backend /uploads/ images must use unoptimized anyway,
 * so there is no benefit to using next/image.
 */
export default function BackendImage({
  src,
  alt = '',
  fallback = '/placeholder.jpg',
  className = '',
  fill,
  sizes,
  width,
  height,
  style,
  onError,
  ...props
}: {
  src: unknown;
  alt?: string;
  fallback?: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  [key: string]: any;
}) {
  // 0: Supabase Storage, 1: backend cũ (Render), 2: placeholder
  const [failedStage, setFailedStage] = useState<0 | 1 | 2>(0);

  // A card can swap photos without remounting, so clear the error state
  // whenever the requested image changes.
  useEffect(() => {
    setFailedStage(0);
  }, [src]);

  const primarySrc = getValidSrc(src, fallback);
  const backendSrc = getBackendUploadsSrc(src);
  const resolvedSrc =
    failedStage === 2 || !primarySrc
      ? fallback
      : failedStage === 1 && backendSrc && backendSrc !== primarySrc
        ? backendSrc
        : primarySrc;

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    // Ảnh mới upload chưa kịp có trên Supabase: thử backend cũ trước khi bỏ cuộc.
    if (failedStage === 0 && backendSrc && backendSrc !== primarySrc) {
      setFailedStage(1);
      return;
    }
    if (failedStage !== 2) {
      setFailedStage(2);
    }
    if (onError) onError(event);
  };

  if (fill) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        onError={handleError}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...style,
        }}
        {...props}
      />
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      onError={handleError}
      style={style}
      {...props}
    />
  );
}
