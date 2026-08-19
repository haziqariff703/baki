'use client';

/**
 * BrandLogo — deterministic brand logo with graceful monogram fallback.
 *
 * Resolves a normalized merchant name via `resolveBrandLogo` (Tier 1 icon /
 * Tier 3 monogram). For icons, renders the simple-icons SVG through an
 * `<img>` (served `unoptimized` by next/image config) and, if it fails to load
 * (network error / 404), swaps to the deterministic monogram via `onError`.
 *
 * Accessibility: the logo is decorative (`alt=""`) — the adjacent merchant
 * name text always conveys the identity; the monogram's color is never the
 * sole differentiator (a letter is always shown).
 */

import { resolveMerchant } from '@/features/merchants';
import { MerchantLogo } from '@/components/shared/MerchantLogo';

interface BrandLogoProps {
  readonly merchantName: string;
  /** Pixel size for the square logo container. Defaults to 32. */
  readonly size?: number;
  readonly className?: string;
}

/**
 * Renders the brand logo with domain resolution and Google Favicon CDN.
 */
export function BrandLogo({ merchantName, size = 32, className }: BrandLogoProps) {
  const resolved = resolveMerchant(merchantName);

  return (
    <MerchantLogo
      name={resolved.canonicalName}
      domain={resolved.domain}
      size={size}
      className={className}
    />
  );
}
