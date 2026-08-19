import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Required in Next 16 — allowlist the single default quality.
    qualities: [75],
    // Allow brand logos from the simple-icons colored CDN (Tier 1).
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'cdn.simpleicons.org',
        pathname: '/**',
      },
    ],
    // Brand SVGs are served as-is; we render them via a plain <img> for the
    // onError→monogram fallback, so no optimizer config is strictly needed.
    // Kept here defensively in case <Image> is adopted later.
    minimumCacheTTL: 2678400, // 31 days
  },
};

export default withNextIntl(nextConfig);
