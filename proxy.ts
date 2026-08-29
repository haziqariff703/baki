import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';
import { buildContentSecurityPolicy } from './lib/security/headers';
import { assertTrustedMutation } from './lib/security/request';

const intlMiddleware = createMiddleware(routing);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Central request gate: API mutation origin checks, locale/session, nonce CSP. */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!SAFE_METHODS.has(request.method)) {
      try {
        assertTrustedMutation(request);
      } catch {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Cross-origin request rejected' },
          { status: 403, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
        );
      }
    }

    const apiResponse = NextResponse.next();
    apiResponse.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return updateSession(request, apiResponse);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', policy);

  const response = await updateSession(request, intlMiddleware(request));
  const reportOnly = process.env.VERCEL_ENV === 'preview' || process.env.CSP_REPORT_ONLY === 'true';
  response.headers.set(
    reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    policy,
  );
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/',
    '/(ms|en)/:path*',
    '/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)',
  ],
};
