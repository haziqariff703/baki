/**
 * Supabase Environment Configuration
 * Strictly derived from environment variables (AGENTS.md §2.4, §19).
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
