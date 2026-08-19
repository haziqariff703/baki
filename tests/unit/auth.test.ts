import { describe, it, expect, vi } from 'vitest';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } } }),
    },
  })),
}));

describe('Supabase Client Helpers', () => {
  it('should initialize browser client', () => {
    const supabase = createBrowserClient();
    expect(supabase).toBeDefined();
    expect(supabase.auth.getUser).toBeDefined();
  });
});
