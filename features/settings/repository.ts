import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/validation/profile';
import { userProfileSchema, DEFAULT_USER_PROFILE } from '@/lib/validation/profile';

export interface ProfileRepository {
  getProfile(userId: string): Promise<UserProfile | null>;
  upsertProfile(userId: string, profile: UserProfile): Promise<UserProfile>;
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const candidate = {
      displayName: data.display_name || '',
      email: '', // filled from auth.user in route/caller
      isStudent: Boolean(data.is_student),
      educationTier: data.education_tier || 'general',
      universityDomain: data.university_domain || '',
      monthlyBudgetSen: data.monthly_allowance_sen ?? DEFAULT_USER_PROFILE.monthlyBudgetSen,
      paydayDayOfMonth: data.payday_day_of_month ?? DEFAULT_USER_PROFILE.paydayDayOfMonth,
      reminderDaysBefore: data.reminder_days_before ?? DEFAULT_USER_PROFILE.reminderDaysBefore,
      defaultViewMode: data.default_view_mode || 'actual',
      statementRetentionWindow: data.statement_retention_window || 'immediate',
    };

    const parsed = userProfileSchema.partial({ email: true }).safeParse(candidate);
    if (!parsed.success) {
      return DEFAULT_USER_PROFILE;
    }

    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed.data,
      email: data.email || DEFAULT_USER_PROFILE.email,
    };
  }

  async upsertProfile(userId: string, profile: UserProfile): Promise<UserProfile> {
    const row = {
      id: userId,
      display_name: profile.displayName,
      is_student: profile.isStudent,
      education_tier: profile.educationTier,
      university_domain: profile.universityDomain,
      monthly_allowance_sen: profile.monthlyBudgetSen,
      payday_day_of_month: profile.paydayDayOfMonth,
      reminder_days_before: profile.reminderDaysBefore,
      default_view_mode: profile.defaultViewMode,
      statement_retention_window: profile.statementRetentionWindow,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to upsert profile: ${error.message}`);
    }

    return profile;
  }
}
