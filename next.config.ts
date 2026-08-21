import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfjs-dist', 'tesseract.js'],
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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
