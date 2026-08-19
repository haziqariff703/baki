/**
 * Manual CRUD & Subscription Management Feature Module
 *
 * Brand logo resolution lives in `./brandRegistry` — a deterministic,
 * presentation-layer registry mapping normalized merchant names to brand logos
 * with a monogram fallback (AGENTS.md §2.1). Exported here for discoverability;
 * components may also import from `./brandRegistry` directly.
 */
export {
  resolveBrandLogo,
  resolveBrandKey,
  normalizeMerchantToKey,
  canonicalMerchantName,
  searchBrands,
  type BrandLogo,
  type BrandSuggestion,
} from './brandRegistry';

export { SupabaseSubscriptionRepository } from './repository';
export type {
  CreateSubscriptionInput,
  Subscription,
  SubscriptionRepository,
  UpdateSubscriptionInput,
} from './types';
