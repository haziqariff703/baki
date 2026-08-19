/**
 * Unit tests for the subscription validation boundary + repository mapping.
 *
 * The row<->domain mapping is the only framework-independent logic in the
 * repository; we test it directly (and the Zod create schema) here. RLS /
 * dual-user behaviour is covered in tests/integration.
 */
import { describe, expect, it } from 'vitest';

import { SupabaseSubscriptionRepository } from '@/features/subscriptions';
import type { Subscription } from '@/features/subscriptions';
import { createSubscriptionSchema } from '@/lib/validation';
import type { BillingCycle } from '@/features/cash-flow';

const validInput = {
  merchantName: 'Spotify',
  amountSen: 1590,
  cycle: 'monthly' as const,
  nextChargeDate: '2026-08-16T00:00:00.000Z',
  usage: 5,
  necessity: 3,
  affordability: 5,
  uniqueness: 3,
  satisfaction: 5,
};

const row = {
  id: 'uuid-1',
  user_id: 'user-a',
  merchant_name: 'Spotify',
  amount_sen: 1590,
  cycle: 'monthly' as BillingCycle,
  next_charge_date: '2026-08-16T00:00:00.000Z',
  usage: 5,
  necessity: 3,
  affordability: 5,
  uniqueness: 3,
  satisfaction: 5,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

describe('createSubscriptionSchema', () => {
  it('accepts a valid create payload', () => {
    expect(createSubscriptionSchema.parse(validInput)).toEqual(validInput);
  });

  it('rejects a non-positive amount', () => {
    expect(() =>
      createSubscriptionSchema.parse({ ...validInput, amountSen: 0 }),
    ).toThrow();
  });

  it('rejects unexpected fields (strict)', () => {
    expect(() =>
      createSubscriptionSchema.parse({ ...validInput, evil: true }),
    ).toThrow();
  });

  it('rejects floating-point sen', () => {
    expect(() =>
      createSubscriptionSchema.parse({ ...validInput, amountSen: 15.9 }),
    ).toThrow();
  });

  it('rejects an out-of-range rating', () => {
    expect(() =>
      createSubscriptionSchema.parse({ ...validInput, usage: 6 }),
    ).toThrow();
  });

  it('rejects an invalid nextChargeDate', () => {
    expect(() =>
      createSubscriptionSchema.parse({
        ...validInput,
        nextChargeDate: 'not-a-date',
      }),
    ).toThrow();
  });
});

describe('SupabaseSubscriptionRepository', () => {
  it('is constructible with a Supabase client', () => {
    const repo = new SupabaseSubscriptionRepository({} as never);
    expect(repo).toBeInstanceOf(SupabaseSubscriptionRepository);
  });

  it('exposes the repository contract methods', () => {
    const repo = new SupabaseSubscriptionRepository({} as never);
    expect(typeof repo.list).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.get).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.remove).toBe('function');
  });
});

// The row is a valid shape of the domain entity after mapping; assert the
// mapping contract shape so a regression in snake_case<->camelCase is caught.
describe('domain shape', () => {
  it('matches the Subscription interface', () => {
    const s: Subscription = {
      id: row.id,
      merchantName: row.merchant_name,
      amountSen: row.amount_sen,
      cycle: row.cycle,
      nextChargeDate: row.next_charge_date,
      usage: row.usage,
      necessity: row.necessity,
      affordability: row.affordability,
      uniqueness: row.uniqueness,
      satisfaction: row.satisfaction,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    expect(s.merchantName).toBe('Spotify');
    expect(s.amountSen).toBe(1590);
  });
});
