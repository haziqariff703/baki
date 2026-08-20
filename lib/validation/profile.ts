import { z } from 'zod';

export const educationTierSchema = z.enum([
  'tertiary_student',
  'young_professional',
  'general',
]);
export type EducationTier = z.infer<typeof educationTierSchema>;

export const defaultViewModeSchema = z.enum(['monthly', 'actual']);
export type DefaultViewMode = z.infer<typeof defaultViewModeSchema>;

export const statementRetentionSchema = z.enum(['immediate', '24_hours']);
export type StatementRetention = z.infer<typeof statementRetentionSchema>;

export const userProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(60, 'Display name must not exceed 60 characters'),
  email: z.string().trim().email('Invalid email address'),
  isStudent: z.boolean(),
  educationTier: educationTierSchema,
  universityDomain: z.string().trim().max(100).default(''),
  monthlyBudgetSen: z
    .number()
    .int('Budget must be an integer number of sen')
    .nonnegative('Monthly budget must be 0 or greater'),
  paydayDayOfMonth: z
    .number()
    .int('Payday must be an integer')
    .min(1, 'Payday day must be between 1 and 31')
    .max(31, 'Payday day must be between 1 and 31')
    .default(25),
  reminderDaysBefore: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  defaultViewMode: defaultViewModeSchema,
  statementRetentionWindow: statementRetentionSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: 'User',
  email: 'user@gmail.com',
  isStudent: false,
  educationTier: 'general',
  universityDomain: '',
  monthlyBudgetSen: 120000, // RM 1,200.00
  paydayDayOfMonth: 25,
  reminderDaysBefore: 3,
  defaultViewMode: 'actual',
  statementRetentionWindow: 'immediate',
};
