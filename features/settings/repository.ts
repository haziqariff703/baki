import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/validation/profile';
import { userProfileSchema, DEFAULT_USER_PROFILE } from '@/lib/validation/profile';
import { resolveUniversityDomain } from '@/features/settings/domainExtractor';

export interface ProfileRepository {
  getProfile(
    userId: string,
    fallbackUser?: { email?: string; displayName?: string },
  ): Promise<UserProfile | null>;
  upsertProfile(userId: string, profile: UserProfile): Promise<UserProfile>;
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getProfile(
    userId: string,
    fallbackUser?: { email?: string; displayName?: string },
  ): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[SupabaseProfileRepository] getProfile error:', error.message);
    }

    const email = fallbackUser?.email || data?.email || DEFAULT_USER_PROFILE.email;
    const displayName =
      data?.display_name?.trim() ||
      fallbackUser?.displayName?.trim() ||
      email.split('@')[0] ||
      DEFAULT_USER_PROFILE.displayName;

    const emailDomain = resolveUniversityDomain(email);
    const storedTier = data?.education_tier || null;
    const isStudent =
      storedTier != null
        ? storedTier === 'tertiary_student'
        : data?.is_student != null
          ? Boolean(data.is_student)
          : emailDomain.isEdu;

    const educationTier =
      storedTier || (isStudent ? 'tertiary_student' : 'general');

    const storedDomain = data?.university_domain?.trim() || '';
    const universityDomain = isStudent
      ? storedDomain || (emailDomain.isEdu ? emailDomain.domain : '')
      : '';



    const monthlyBudget =
      typeof data?.monthly_allowance_sen === 'number'
        ? data.monthly_allowance_sen
        : DEFAULT_USER_PROFILE.monthlyBudgetSen;

    return {
      displayName,
      email,
      isStudent,
      educationTier,
      universityDomain,
      monthlyBudgetSen: monthlyBudget,
      paydayDayOfMonth: data?.payday_day_of_month ?? DEFAULT_USER_PROFILE.paydayDayOfMonth,
      reminderDaysBefore: data?.reminder_days_before ?? DEFAULT_USER_PROFILE.reminderDaysBefore,
      defaultViewMode: data?.default_view_mode || 'actual',
      statementRetentionWindow: data?.statement_retention_window || 'immediate',
    };
  }



  async upsertProfile(userId: string, profile: UserProfile): Promise<UserProfile> {
    const fullRow: Record<string, any> = {
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

    // 1. Try full upsert with all attributes
    const { error: fullError } = await this.supabase
      .from('profiles')
      .upsert(fullRow, { onConflict: 'id' });

    if (!fullError) {
      return profile;
    }

    // 2. Try direct UPDATE of fullRow
    const { error: updateError } = await this.supabase
      .from('profiles')
      .update(fullRow)
      .eq('id', userId);

    if (!updateError) {
      return profile;
    }

    console.warn('[SupabaseProfileRepository] Full update failed, attempting standard attributes update:', updateError.message);

    // 3. Fallback: Update standard attributes without payday_day_of_month in case the latest migration is pending
    const standardRow = {
      display_name: profile.displayName,
      is_student: profile.isStudent,
      education_tier: profile.educationTier,
      university_domain: profile.universityDomain,
      monthly_allowance_sen: profile.monthlyBudgetSen,
      reminder_days_before: profile.reminderDaysBefore,
      default_view_mode: profile.defaultViewMode,
      statement_retention_window: profile.statementRetentionWindow,
      updated_at: new Date().toISOString(),
    };

    const { error: standardError } = await this.supabase
      .from('profiles')
      .update(standardRow)
      .eq('id', userId);

    if (!standardError) {
      return profile;
    }

    // 4. Essential fallback (monthly_allowance_sen + display_name)
    const coreUpdate = {
      display_name: profile.displayName,
      monthly_allowance_sen: profile.monthlyBudgetSen,
      updated_at: new Date().toISOString(),
    };

    const { error: coreError } = await this.supabase
      .from('profiles')
      .update(coreUpdate)
      .eq('id', userId);

    if (coreError) {
      throw new Error(`Failed to update profile: ${coreError.message}`);
    }

    return profile;
  }


}
