'use client';

/**
 * Universal Merchant Logo component.
 *
 * Fetches high-resolution brand icons dynamically via Google Favicon CDN
 * with sub-millisecond monogram fallback when offline or unavailable.
 * Zero external package dependencies, zero cost.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MerchantLogoProps {
  readonly name: string;
  readonly domain?: string;
  readonly className?: string;
  readonly size?: number;
}

export function MerchantLogo({
  name,
  domain,
  className,
  size = 28,
}: MerchantLogoProps) {
  const [failed, setFailed] = useState(false);

  const monogram = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(
          'rounded-lg border border-border-1 bg-surface-1 object-contain p-1 shrink-0',
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg bg-surface-3 border border-border-2 flex items-center justify-center font-mono font-medium text-text-primary shrink-0 select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.35)),
      }}
      aria-label={name}
    >
      {monogram || name.slice(0, 2).toUpperCase()}
    </div>
  );
}
