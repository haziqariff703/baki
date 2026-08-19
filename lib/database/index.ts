/**
 * Supabase client helpers & query factories (AGENTS.md §4, §10.1, §11).
 *
 * Server-only: this module creates clients for server-side environments.
 * The `service_role` client is guarded to never be importable from browser
 * code (§2.4). RLS applies to all user-scoped queries via the anon client.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function missing(message: string): never {
  throw new Error(`[baki] Missing environment variable: ${message}`);
}

/**
 * Server Supabase client bound to the request's auth cookies.
 *
 * Uses the anon key so every query runs under RLS (§10.1). Creates a fresh
 * client per request — never share across requests.
 */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const url = supabaseUrl ?? missing('NEXT_PUBLIC_SUPABASE_URL');
  const key = supabaseAnonKey ?? missing('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies cannot be set.
          // Middleware must refresh the session; safe to ignore here.
        }
      },
    },
  });
}

/**
 * Server Supabase client using the `service_role` key.
 *
 * This bypasses RLS and MUST only be used in protected server-side code for
 * operations that legitimately require elevation (e.g. audit/export/deletion).
 * It must never be imported from client or browser code (§2.4, §19).
 */
export function createServiceRoleSupabase(): SupabaseClient {
  const url = supabaseUrl ?? missing('NEXT_PUBLIC_SUPABASE_URL');
  const key = supabaseServiceRoleKey ?? missing('SUPABASE_SERVICE_ROLE_KEY');
  // Service-role client is stateless and server-only; no cookie handling needed.
  return createServerClient(url, key, { cookies: { getAll: () => [] } });
}
