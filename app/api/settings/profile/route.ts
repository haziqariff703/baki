import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userProfileSchema } from '@/lib/validation/profile';
import { SupabaseProfileRepository } from '@/features/settings/repository';

/**
 * User Profile Settings API Handler (§11 Auth / §8.1 Sen / §2.3 Privacy).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fallbackUser = {
      email: user.email,
      displayName:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0],
    };

    const repo = new SupabaseProfileRepository(supabase);
    const profile = await repo.getProfile(user.id, fallbackUser);

    return NextResponse.json({
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = userProfileSchema.safeParse({
      ...body,
      email: user.email || body.email,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const repo = new SupabaseProfileRepository(supabase);
    const saved = await repo.upsertProfile(user.id, validation.data);

    return NextResponse.json({ success: true, profile: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
