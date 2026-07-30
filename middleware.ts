import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  // First, apply next-intl middleware for all routes
  const response = intlMiddleware(request)

  // Skip supabase auth check for purely static files or api routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('/api/')
  ) {
    return response;
  }

  // Create an unauthenticated Supabase client instance (mocking it for now)
  // because when local supabase isn't started or env vars aren't set, this will crash.
  // In a real app we need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Silently continue without auth check if env vars aren't present yet
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;
  // Dashboard routes protection
  const isDashboardRoute = path.match(/^\/(en|ms)\/dashboard/)

  if (isDashboardRoute && !user) {
    // Redirect to login page, preserving locale
    const locale = path.split('/')[1] || 'en';
    return NextResponse.redirect(new URL(`/${locale}`, request.url))
  }

  return response
}

export const config = {
  // Match only internationalized pathnames and everything except static assets
  matcher: ['/', '/(ms|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
}
