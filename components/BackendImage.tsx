'use client';

import { useEffect, useState } from 'react';
import { getValidSrc } from '@/lib/image';

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
  const [failed, setFailed] = useState(false);

  // A card can swap photos without remounting, so clear the error state
  // whenever the requested image changes.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const resolvedSrc = failed ? fallback : getValidSrc(src, fallback);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setFailed(true);
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
