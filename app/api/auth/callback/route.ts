import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  
  // if "next" is in param, use it as the redirect URL, default to dashboard
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    // If exchangeCodeForSession threw flow_state_already_used, the session may already have been set
    // by a parallel request or prefetch. Check if user is already authenticated.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.warn('[Auth Callback] Code exchange failed:', error.message)
  }

  // If there's an error param or code exchange failed and no active user session
  // redirect back to login with error context
  const redirectUrl = new URL('/login', origin)
  if (errorParam || errorCode) {
    redirectUrl.searchParams.set('error', errorCode || errorParam || 'auth_failed')
  }
  return NextResponse.redirect(redirectUrl)
}

