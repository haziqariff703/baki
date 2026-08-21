/**
 * Runtime validation for the login trust boundary (AGENTS.md §7).
 * Auth backend is not yet wired — this schema only shapes the client form.
 * Field-error keys are i18n codes (Login.errors.*), never hardcoded copy.
 */
import { z } from 'zod';

export const loginFormSchema = z
  .object({
    email: z.string().trim().min(1, { error: 'required' }).email({ error: 'email' }),
    password: z.string().min(8, { error: 'password' }),
  })
  .strict();

export type LoginFormSchema = z.infer<typeof loginFormSchema>;
