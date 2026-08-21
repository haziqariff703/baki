import { describe, it, expect } from 'vitest';
import {
  userProfileSchema,
  DEFAULT_USER_PROFILE,
  type UserProfile,
} from '@/lib/validation/profile';

describe('UserProfile Validation & Business Rules (§2.3 / §8.1)', () => {
  it('validates default user profile successfully', () => {
    const result = userProfileSchema.safeParse(DEFAULT_USER_PROFILE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('User');
      expect(result.data.isStudent).toBe(false);
      expect(result.data.monthlyBudgetSen).toBe(120000);
      expect(result.data.educationTier).toBe('general');
      expect(result.data.statementRetentionWindow).toBe('immediate');
    }
  });

  it('rejects empty or excessively long display names', () => {
    const invalidEmpty = { ...DEFAULT_USER_PROFILE, displayName: '   ' };
    const emptyResult = userProfileSchema.safeParse(invalidEmpty);
    expect(emptyResult.success).toBe(false);

    const invalidLong = {
      ...DEFAULT_USER_PROFILE,
      displayName: 'a'.repeat(65),
    };
    const longResult = userProfileSchema.safeParse(invalidLong);
    expect(longResult.success).toBe(false);
  });

  it('rejects invalid email addresses', () => {
    const invalidEmail = { ...DEFAULT_USER_PROFILE, email: 'not-an-email' };
    const result = userProfileSchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
  });

  it('enforces non-negative integer sen for monthly budget', () => {
    const negativeBudget = { ...DEFAULT_USER_PROFILE, monthlyBudgetSen: -500 };
    expect(userProfileSchema.safeParse(negativeBudget).success).toBe(false);

    const floatBudget = { ...DEFAULT_USER_PROFILE, monthlyBudgetSen: 120.5 };
    expect(userProfileSchema.safeParse(floatBudget).success).toBe(false);

    const zeroBudget = { ...DEFAULT_USER_PROFILE, monthlyBudgetSen: 0 };
    expect(userProfileSchema.safeParse(zeroBudget).success).toBe(true);
  });

  it('validates education tiers and reminder intervals', () => {
    const validYoungAdult: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      isStudent: false,
      educationTier: 'young_professional',
      reminderDaysBefore: 7,
      defaultViewMode: 'monthly',
      statementRetentionWindow: '24_hours',
    };
    expect(userProfileSchema.safeParse(validYoungAdult).success).toBe(true);

    const invalidReminder = {
      ...DEFAULT_USER_PROFILE,
      reminderDaysBefore: 15 as any,
    };
    expect(userProfileSchema.safeParse(invalidReminder).success).toBe(false);
  });
});
