import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/subscriptions',
  '/cash-flow',
  '/transactions',
  '/imports',
  '/notifications',
  '/review',
  '/settings',
];

export async function updateSession(request: NextRequest, response: NextResponse) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return response;
    }

    let cookiesToSetOnResponse: { name: string; value: string; options?: any }[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSetOnResponse = cookiesToSet;
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // Determine normalized pathname without locale prefix
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] === 'ms' ? 'ms' : 'en';
    const cleanPath =
      segments[0] === 'ms' || segments[0] === 'en'
        ? `/${segments.slice(1).join('/')}`
        : pathname;

    const isProtected = PROTECTED_PREFIXES.some(
      (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`),
    );

    // If accessing a protected route without a verified session, redirect to login
    if (isProtected && !user) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      const redirectRes = NextResponse.redirect(loginUrl);
      cookiesToSetOnResponse.forEach(({ name, value, options }) =>
        redirectRes.cookies.set(name, value, options),
      );
      return redirectRes;
    }

    // Apply any cookie updates to the incoming response
    cookiesToSetOnResponse.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );

    return response;
  } catch (error) {
    console.error('[Middleware] Supabase session error:', error);
    return response;
  }
}

