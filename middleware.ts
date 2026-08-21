import { type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { updateSession } from './lib/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  // Apply next-intl middleware for all routes.
  const response = intlMiddleware(request)
  return await updateSession(request, response)
}

export const config = {
  // Match only internationalized pathnames and everything except static assets
  matcher: ['/', '/(ms|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
}
