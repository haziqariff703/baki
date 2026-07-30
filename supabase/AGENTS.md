# Supabase & Database Agent Rules (`supabase/`)

## Domain Directives

1. **Row Level Security (RLS)**:
   * Every user-owned table (`subscriptions`, `transactions`, `score_results`, `notifications`, `profiles`) **must** have RLS enabled.
   * RLS policies must enforce `(select auth.uid()) = user_id`.

2. **Dual-User Verification**:
   * All RLS policy tests must verify that User A cannot read, update, or delete User B's records under any condition.

3. **No Service-Role Key Leakage**:
   * Never use the Supabase `service_role` key in browser or client-side code.
