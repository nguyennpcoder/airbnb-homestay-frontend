'use client';

import { useEffect, useState } from 'react';
import { getBackendUploadsSrc, getSupabaseUploadsSrc, getValidSrc } from '@/lib/image';

/**
 * Plain <img> for listing/avatar photos.
 * Avoids next/image optimizer issues with AVIF + remote hosts on Vercel.
 *
 * Failover chain:
 *  0 → primary (same-origin /uploads, or configured IMAGE_SOURCE)
 *  1 → Render backend absolute URL
 *  2 → Supabase (only if different from primary)
 *  3 → placeholder
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
  priority = false,
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
  /** Load immediately (hero / above-the-fold images). */
  priority?: boolean;
  [key: string]: any;
}) {
  const [failedStage, setFailedStage] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    setFailedStage(0);
  }, [src]);

  const primarySrc = getValidSrc(src, fallback);
  const backendSrc = getBackendUploadsSrc(src);
  const supabaseSrc = getSupabaseUploadsSrc(src);

  const resolvedSrc = (() => {
    if (failedStage >= 3 || !primarySrc) return fallback || '/placeholder.jpg';
    if (failedStage === 0) return primarySrc;
    if (failedStage === 1 && backendSrc && backendSrc !== primarySrc) return backendSrc;
    if (failedStage === 2 && supabaseSrc && supabaseSrc !== primarySrc && supabaseSrc !== backendSrc) {
      return supabaseSrc;
    }
    return fallback || '/placeholder.jpg';
  })();

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    if (failedStage === 0 && backendSrc && backendSrc !== primarySrc) {
      setFailedStage(1);
      return;
    }
    if (
      failedStage <= 1 &&
      supabaseSrc &&
      supabaseSrc !== primarySrc &&
      supabaseSrc !== backendSrc
    ) {
      setFailedStage(2);
      return;
    }
    if (failedStage !== 3) {
      setFailedStage(3);
    }
    if (onError) onError(event);
  };

  const shared = {
    src: resolvedSrc,
    alt,
    className,
    sizes,
    loading: (priority ? 'eager' : 'lazy') as 'eager' | 'lazy',
    fetchPriority: priority ? ('high' as const) : undefined,
    decoding: 'async' as const,
    onError: handleError,
  };

  if (fill) {
    return (
      <img
        {...shared}
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
      {...shared}
      width={width}
      height={height}
      style={style}
      {...props}
    />
  );
}
