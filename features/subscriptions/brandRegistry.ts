/**
 * Brand logo registry — deterministic merchant-name → logo mapping.
 *
 * This is the presentation layer's single source of truth for resolving a
 * normalized merchant name to a brand logo (Tier 1) with a deterministic
 * monogram fallback (Tier 3). No AI, no network name→domain resolution — the
 * mapping is static and auditable (AGENTS.md §2.1 determinism).
 *
 * Tier 1 uses simple-icons (CC0 project) served from jsDelivr's CDN. Each
 * entry maps the normalized merchant name (as stored in a subscription's
 * `merchantName`) to a simple-icons slug. Unknown merchants fall back to a
 * monogram computed from the name.
 *
 * Privacy: only a known merchant slug (never a user-typed string) is ever sent
 * to the CDN. Raw statement text, card numbers, and account data are never
 * involved here (AGENTS.md §2.3).
 */

/** A resolved brand logo: a colored SVG URL or a monogram. */
export type BrandLogo =
  | { readonly kind: 'icon'; readonly slug: string; readonly url: string }
  | { readonly kind: 'monogram'; readonly label: string; readonly color: string };

/**
 * simple-icons colored CDN base. `cdn.simpleicons.org/{slug}/{hex}` returns the
 * brand glyph filled with `hex`. No version pin needed — the colored endpoint
 * is stable and version-independent.
 */
const SIMPLE_ICONS_COLOR_BASE = 'https://cdn.simpleicons.org';

/**
 * A brand entry: simple-icons slug + the hex used to fill the glyph.
 *
 * `hex` is the official brand color from simple-icons. For brands whose true
 * color is too dark to read on Baki's near-black surface, we use a light
 * neutral (`LIGHT_NEUTRAL`) instead so the logo stays visible in dark mode.
 */
interface BrandEntry {
  readonly slug: string;
  readonly hex: string;
}

/** Light neutral used for near-black brand marks (visible on dark surface). */
const LIGHT_NEUTRAL = 'ededed';

/**
 * Curated merchant-name → brand-entry map.
 *
 * Keys are the normalized names that appear in `tests/fixtures/subscriptions.ts`
 * and in real imported data after merchant normalization. Matching is exact and
 * case-insensitive; keep it small and auditable. `hex` values are the official
 * simple-icons brand colors; brands whose color is too dark (Apple, GitHub,
 * etc.) are swapped to LIGHT_NEUTRAL for dark-mode visibility.
 *
 * Only slugs verified to exist on `cdn.simpleicons.org` are included. Brands
 * without a simple-icons slug (local Malaysian telcos, Disney+, Amazon, Canva,
 * Slack, OpenAI, etc.) are intentionally OMITTED so they cleanly fall back to
 * a deterministic monogram rather than a broken image.
 */
const BRAND_SLUGS: Readonly<Record<string, BrandEntry>> = {
  spotify: { slug: 'spotify', hex: '1ED760' },
  netflix: { slug: 'netflix', hex: 'E50914' },
  youtube: { slug: 'youtube', hex: 'FF0000' },
  'youtube premium': { slug: 'youtubemusic', hex: 'FF0000' },
  'youtube music': { slug: 'youtubemusic', hex: 'FF0000' },
  'icloud+': { slug: 'icloud', hex: '3693F3' },
  icloud: { slug: 'icloud', hex: '3693F3' },
  apple: { slug: 'apple', hex: LIGHT_NEUTRAL },
  'apple tv+': { slug: 'appletv', hex: LIGHT_NEUTRAL },
  'apple music': { slug: 'applemusic', hex: 'FA243C' },
  'apple arcade': { slug: 'applearcade', hex: LIGHT_NEUTRAL },
  google: { slug: 'google', hex: '4285F4' },
  'google one': { slug: 'google', hex: '4285F4' },
  'google drive': { slug: 'googledrive', hex: '4285F4' },
  'google play': { slug: 'googleplay', hex: '414141' },
  'google photos': { slug: 'googlephotos', hex: '4285F4' },
  'google gemini': { slug: 'googlegemini', hex: '8E75B2' },
  gmail: { slug: 'gmail', hex: 'EA4335' },
  namecheap: { slug: 'namecheap', hex: 'DE3723' },
  'namecheap domain': { slug: 'namecheap', hex: 'DE3723' },
  github: { slug: 'github', hex: LIGHT_NEUTRAL },
  notion: { slug: 'notion', hex: LIGHT_NEUTRAL },
  dropbox: { slug: 'dropbox', hex: '0061FF' },
  figma: { slug: 'figma', hex: 'F24E1E' },
  zoom: { slug: 'zoom', hex: '0B5CFF' },
  grammarly: { slug: 'grammarly', hex: '027E6F' },
  claude: { slug: 'claude', hex: 'D97757' },
  anthropic: { slug: 'anthropic', hex: LIGHT_NEUTRAL },
  // Streaming
  crunchyroll: { slug: 'crunchyroll', hex: 'FF5E00' },
  astro: { slug: 'astro', hex: 'BC52EE' },
  tidal: { slug: 'tidal', hex: LIGHT_NEUTRAL },
  'hbo max': { slug: 'hbomax', hex: LIGHT_NEUTRAL },
  max: { slug: 'max', hex: '525252' },
  // Gaming
  steam: { slug: 'steam', hex: LIGHT_NEUTRAL },
  'epic games': { slug: 'epicgames', hex: '313131' },
  gog: { slug: 'gogdotcom', hex: '86328A' },
  playstation: { slug: 'playstation', hex: '0070D1' },
  roblox: { slug: 'roblox', hex: LIGHT_NEUTRAL },
  pubg: { slug: 'pubg', hex: 'F4B942' },
  'riot games': { slug: 'riotgames', hex: 'EB0029' },
  'league of legends': { slug: 'leagueoflegends', hex: 'C28F2C' },
  ea: { slug: 'ea', hex: LIGHT_NEUTRAL },
  discord: { slug: 'discord', hex: '5865F2' },
  'discord nitro': { slug: 'discord', hex: '5865F2' },
  // E-commerce / food / wallet
  shopee: { slug: 'shopee', hex: 'EE4D2D' },
  shopeefood: { slug: 'shopee', hex: 'EE4D2D' },
  grab: { slug: 'grab', hex: '00B14F' },
  grabunlimited: { slug: 'grab', hex: '00B14F' },
  foodpanda: { slug: 'foodpanda', hex: 'D70F64' },
  airasia: { slug: 'airasia', hex: 'FF0000' },
  boost: { slug: 'boost', hex: 'F7901E' },
  paypal: { slug: 'paypal', hex: '00457C' },
  // Education
  coursera: { slug: 'coursera', hex: '0056D2' },
  udemy: { slug: 'udemy', hex: 'A435F0' },
  skillshare: { slug: 'skillshare', hex: '00FF84' },
  duolingo: { slug: 'duolingo', hex: '58CC02' },
};

/**
 * Deterministic palette for the monogram fallback. Fixed, WCAG-AA-conscious
 * background colors on the dark surface. The name is hashed to pick an index,
 * so the same merchant always gets the same color (never color alone — the
 * letter is always shown alongside the text label).
 */
const MONOGRAM_PALETTE: readonly string[] = [
  '#1d4ed8', // blue
  '#047857', // emerald
  '#b45309', // amber
  '#be123c', // rose
  '#7c3aed', // violet
  '#0e7490', // cyan
  '#c2410c', // orange
  '#4d7c0f', // lime
];

/** Simple deterministic string hash (djb2) → unsigned 32-bit integer. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Build the colored CDN URL for a brand entry. */
function brandUrl(entry: BrandEntry): string {
  return `${SIMPLE_ICONS_COLOR_BASE}/${entry.slug}/${entry.hex}`;
}

/* -------------------------------------------------------------------------- */
/*  Merchant descriptor → canonical brand key (deterministic, AGENTS.md §2.1)  */
/* -------------------------------------------------------------------------- */

/** Collapse runs of whitespace (incl. newlines, tabs) into a single space. */
const WHITESPACE_RUN = /\s+/g;

/**
 * Normalize a raw bank-statement descriptor into a canonical lowercase brand
 * key for registry lookup. Pure and deterministic — never calls an LLM and
 * never performs a network lookup.
 *
 * Applies, in order:
 *   1. Lowercase + trim.
 *   2. Strip parenthetical/bracketed noise (dates, card last-4, references).
 *   3. Strip leading payment-system tokens (`fpx`, `myr`, `web`).
 *   4. Strip trailing hold markers (`*pending`, `*pending auth`, `*preauth`).
 *   5. Strip country/legal suffixes (`se`, `sg`, `my`, `ltd`, `llc`, `pty`,
 *      `sdn bhd`, `sdn. bhd.`).
 *   6. Strip standalone phone numbers and 10–16 digit card/reference runs.
 *   7. Collapse `*` and internal whitespace to single spaces; trim.
 *
 * The result is a key that can be matched against `BRAND_SLUGS` or
 * `MERCHANT_ALIASES`. It never leaves the client/server boundary as a raw
 * descriptor — only the resolved slug is ever sent to a CDN (privacy, §2.3).
 */
export function normalizeMerchantToKey(input: string): string {
  let s = input.toLowerCase().trim();

  // 2 · strip bracketed noise: (dates, refs, card last-4, amounts)
  s = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');

  // 3 · strip leading payment-system tokens
  s = s.replace(/^(fpx|myr|web|pos)\s+/i, '');

  // 4 · strip trailing hold markers
  s = s
    .replace(/\*\s*pending\s*auth\b/g, ' ')
    .replace(/\*\s*pending\b/g, ' ')
    .replace(/\*\s*preauth\b/g, ' ');

  // 5 · strip country/legal suffixes
  s = s.replace(/\b(se|sg|my|ltd|llc|pty|sdn\s*bhd)\b\.?/g, ' ');

  // 6 · strip phone numbers and long card/reference runs
  s = s.replace(/\b\d{4,}\b/g, ' ');

  // 7 · collapse `*` and whitespace runs
  s = s.replace(/\*/g, ' ').replace(WHITESPACE_RUN, ' ').trim();

  return s;
}

/**
 * Deterministic alias table: raw (already-stripped) descriptor key → canonical
 * registry key. Extends `BRAND_SLUGS` without duplicating brand data — an alias
 * points at a key that already exists in the registry (or at a name that will
 * fall to monogram). Keep it small, versioned, and auditable (AGENTS.md §2.1,
 * §2.6).
 */
const MERCHANT_ALIASES: Readonly<Record<string, string>> = {
  'sptf spotify': 'spotify',
  spot: 'spotify',
  netflx: 'netflix',
  ggrab: 'grab',
  'grab food': 'grab',
  'touch n go': 'touch n go',
  tng: 'touch n go',
  'touchngo': 'touch n go',
  celcom: 'celcom',
  'celcomdigi': 'celcom',
  digi: 'digi',
  maxis: 'maxis',
  'microsoft 365': 'microsoft 365',
  microsoft: 'microsoft 365',
  'youtube premium': 'youtube premium',
  'yt premium': 'youtube premium',
  'google one': 'google one',
  'g one': 'google one',
  shopee: 'shopee',
  'shopeepay': 'shopee',
  viu: 'viu',
  iqiyi: 'iqiyi',
  wetv: 'wetv',
  lazada: 'lazada',
  unifi: 'unifi',
  'tm unifi': 'unifi',
  time: 'time',
  hotlink: 'hotlink',
  'u mobile': 'u mobile',
  umobile: 'u mobile',
  bigpay: 'bigpay',
};

/**
 * Resolve a raw merchant descriptor to a canonical brand key (deterministic).
 *
 * First strips noise via `normalizeMerchantToKey`, then applies the alias table.
 * Returns the canonical key (lowercased) ready for `resolveBrandLogo`. Falls
 * back to the stripped key unchanged when no alias matches, so `resolveBrandLogo`
 * still returns a monogram for unknown merchants.
 */
export function resolveBrandKey(descriptor: string): string {
  const stripped = normalizeMerchantToKey(descriptor);
  return MERCHANT_ALIASES[stripped] ?? stripped;
}

/**
 * Resolve a raw merchant descriptor to a canonical display name.
 *
 * Strips noise and maps aliases via `resolveBrandKey`, but **preserves the
 * original casing** of the descriptor when it already names a known brand —
 * so "Netflix" stays "Netflix", "Spotify" stays "Spotify", "iCloud+" stays
 * "iCloud+". Only noisy/aliased descriptors (e.g. "SPTF*SPOTIFY SE", "GGRAB")
 * are rewritten to the canonical registry name.
 *
 * Deterministic (§2.1). Unknown descriptors are returned title-cased so they
 * stay readable.
 *
 * Example: "Netflix" → "Netflix"; "SPTF*SPOTIFY SE" → "Spotify"; "GGRAB" → "Grab".
 */
export function canonicalMerchantName(descriptor: string): string {
  const key = resolveBrandKey(descriptor);

  // Did the descriptor already name a known brand (case-insensitively)? If so,
  // preserve its original casing so we never mangle "Netflix" → "netflix".
  const strippedOriginal = normalizeMerchantToKey(descriptor);
  const isDirectBrand = Object.keys(BRAND_SLUGS).some(
    (name) => name.toLowerCase() === strippedOriginal,
  );
  if (isDirectBrand) {
    // Return the sanitised original (preserves "Netflix", "iCloud+" casing).
    return descriptor.trim();
  }

  // Alias matched a known brand (e.g. "sptf spotify" → "spotify")? Use the
  // canonical registry name so it resolves to a logo with proper casing.
  const canonicalForAlias = MERCHANT_ALIASES[key];
  if (canonicalForAlias) {
    return canonicalMerchantName(canonicalForAlias);
  }

  // Unknown: title-case each word for a clean, readable display name.
  return key
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Resolve a normalized merchant name to a brand logo (deterministic).
 *
 * Returns a Tier-1 icon when the name is in the registry, otherwise a Tier-3
 * monogram derived from the name. Never throws; always returns a value.
 */
export function resolveBrandLogo(merchantName: string): BrandLogo {
  const key = merchantName.trim().toLowerCase();
  const entry = BRAND_SLUGS[key];
  if (entry) {
    return { kind: 'icon', slug: entry.slug, url: brandUrl(entry) };
  }
  const label = merchantName.trim().charAt(0).toUpperCase() || '?';
  const color = MONOGRAM_PALETTE[hashString(key) % MONOGRAM_PALETTE.length]!;
  return { kind: 'monogram', label, color };
}

/**
 * A brand match surfaced while the user types: the merchant label the user can
 * select plus the resolved logo. The logo is always an icon (these come from
 * the curated registry), so no monogram fallback is needed on matches.
 */
export interface BrandSuggestion {
  readonly name: string;
  readonly slug: string;
  readonly url: string;
}

/**
 * Search the brand registry for known brands matching a partial user input.
 *
 * Matches are case-insensitive substring hits on the registry key (normalized
 * merchant names, e.g. "spotify", "youtube premium"). Results are de-duplicated
 * by slug and sorted alphabetically. Deterministic and dependency-free — the
 * caller decides how many to show. Empty/whitespace input returns no results.
 */
export function searchBrands(query: string): readonly BrandSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];

  const seen = new Set<string>();
  const results: BrandSuggestion[] = [];
  for (const [name, entry] of Object.entries(BRAND_SLUGS)) {
    if (!name.includes(q)) continue;
    if (seen.has(entry.slug)) continue; // de-dupe aliases → same slug
    seen.add(entry.slug);
    results.push({ name, slug: entry.slug, url: brandUrl(entry) });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
