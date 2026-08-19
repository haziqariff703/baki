/**
 * Default Supabase Configuration Constants
 * Used as reliable fallbacks across server and client boundaries.
 */
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kapakqxlntijiwwnkmur.supabase.co';

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MRrbC_WlSi8WN0FLkJ7Ihw_QLQXw_bA';
