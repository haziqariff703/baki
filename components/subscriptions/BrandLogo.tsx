'use client';

/**
 * Universal Brand Logo component:
 * 1. Curated SimpleIcons vector SVG CDN for known brands with official brand colors.
 * 2. High-resolution Google Favicon CDN via resolved merchant domain (e.g. unifi.com.my).
 * 3. Deterministic colored monogram fallback with WCAG AA contrast.
 */

import { useState } from 'react';
import { resolveBrandLogo } from '@/features/subscriptions/brandRegistry';
import { resolveMerchant } from '@/features/merchants';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  readonly merchantName: string;
  /** Pixel size for the square logo container. Defaults to 32. */
  readonly size?: number;
  readonly className?: string;
}

export function BrandLogo({ merchantName, size = 32, className }: BrandLogoProps) {
  const [svgFailed, setSvgFailed] = useState(false);
  const [domainFailed, setDomainFailed] = useState(false);

  const brand = resolveBrandLogo(merchantName);
  const resolved = resolveMerchant(merchantName);

  // 1. Curated vector SVG logo
  if (brand.kind === 'icon' && !svgFailed) {
    return (
      <img
        src={brand.url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setSvgFailed(true)}
        className={cn(
          'rounded-lg border border-border-1 bg-surface-1 object-contain p-1 shrink-0',
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  // 2. Domain Favicon CDN (Google Favicons)
  if (resolved.domain && !domainFailed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${resolved.domain}&sz=${size * 2}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setDomainFailed(true)}
        className={cn(
          'rounded-lg border border-border-1 bg-surface-1 object-contain p-1 shrink-0',
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  // 3. Deterministic monogram fallback
  const label =
    brand.kind === 'monogram'
      ? brand.label
      : (resolved.canonicalName.slice(0, 2).trim() || 'S').toUpperCase();
  const color =
    brand.kind === 'monogram' ? brand.color : '#059669';

  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center font-mono font-medium text-white shrink-0 select-none shadow-sm',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.max(10, Math.round(size * 0.38)),
      }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
