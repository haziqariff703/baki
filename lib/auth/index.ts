/**
 * Session helpers & permission checks (AGENTS.md §11).
 *
 * The authenticated user is always derived from the verified session — never
 * from a `user_id` supplied by the browser (§11, §19).
 */
import type { User } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/database';

/**
 * Resolve the authenticated user from the verified session, or null.
 *
 * This is the single source of truth for user identity in protected routes.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Assert an authenticated user, throwing UNAUTHENTICATED if absent.
 *
 * Route handlers call this first (§11 step 1).
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    // Import lazily to avoid a circular import at module load.
    const { ApplicationError } = await import('@/lib/logging');
    throw new ApplicationError('UNAUTHENTICATED', 'Authentication required');
  }
  return user;
}
