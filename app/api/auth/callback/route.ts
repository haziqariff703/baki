import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'
import { logOperational } from '@/lib/logging'
import { safeRelativePath } from '@/lib/security/request'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  
  // if "next" is in param, use it as the redirect URL, default to dashboard
  const next = safeRelativePath(searchParams.get('next'), '/dashboard')

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }

    // If exchangeCodeForSession threw flow_state_already_used, the session may already have been set
    // by a parallel request or prefetch. Check if user is already authenticated.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    logOperational({ level: 'warn', message: 'auth callback code exchange failed' })
  }

  // If there's an error param or code exchange failed and no active user session
  // redirect back to login with error context
  const redirectUrl = new URL('/login', origin)
  if (errorParam || errorCode) {
    redirectUrl.searchParams.set('error', errorCode || errorParam || 'auth_failed')
  }
  return NextResponse.redirect(redirectUrl)
}

