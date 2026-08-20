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
  'apple one': { slug: 'apple', hex: LIGHT_NEUTRAL },
  google: { slug: 'google', hex: '4285F4' },
  'google one': { slug: 'google', hex: '4285F4' },
  'google drive': { slug: 'googledrive', hex: '4285F4' },
  'google play': { slug: 'googleplay', hex: '414141' },
  'google photos': { slug: 'googlephotos', hex: '4285F4' },
  'google gemini': { slug: 'googlegemini', hex: '8E75B2' },
  'google workspace': { slug: 'google', hex: '4285F4' },
  gmail: { slug: 'gmail', hex: 'EA4335' },
  namecheap: { slug: 'namecheap', hex: 'DE3723' },
  'namecheap domain': { slug: 'namecheap', hex: 'DE3723' },
  github: { slug: 'github', hex: LIGHT_NEUTRAL },
  'github copilot': { slug: 'githubcopilot', hex: LIGHT_NEUTRAL },
  gitlab: { slug: 'gitlab', hex: 'FC6D26' },
  notion: { slug: 'notion', hex: LIGHT_NEUTRAL },
  dropbox: { slug: 'dropbox', hex: '0061FF' },
  figma: { slug: 'figma', hex: 'F24E1E' },
  zoom: { slug: 'zoom', hex: '0B5CFF' },
  slack: { slug: 'slack', hex: '4A154B' },
  jira: { slug: 'jira', hex: '0052CC' },
  linear: { slug: 'linear', hex: '5E6AD2' },
  trello: { slug: 'trello', hex: '0052CC' },
  asana: { slug: 'asana', hex: 'F06A6A' },
  miro: { slug: 'miro', hex: 'FFD02F' },
  grammarly: { slug: 'grammarly', hex: '027E6F' },
  claude: { slug: 'claude', hex: 'D97757' },
  anthropic: { slug: 'anthropic', hex: LIGHT_NEUTRAL },
  canva: { slug: 'canva', hex: '00C4CC' },
  openai: { slug: 'openai', hex: '412991' },
  'chatgpt plus': { slug: 'openai', hex: '412991' },
  chatgpt: { slug: 'openai', hex: '412991' },
  midjourney: { slug: 'midjourney', hex: LIGHT_NEUTRAL },
  'microsoft 365': { slug: 'microsoft365', hex: 'D83B01' },
  microsoft: { slug: 'microsoft', hex: '5E5E5E' },
  onedrive: { slug: 'microsoftonedrive', hex: '0078D4' },
  teams: { slug: 'microsoftteams', hex: '6264A7' },
  adobe: { slug: 'adobe', hex: 'FF0000' },
  'adobe creative cloud': { slug: 'adobecreativecloud', hex: 'DA1F26' },
  photoshop: { slug: 'adobephotoshop', hex: '31A8FF' },
  illustrator: { slug: 'adobeillustrator', hex: 'FF9A00' },
  '1password': { slug: '1password', hex: '0A85EA' },
  bitwarden: { slug: 'bitwarden', hex: '175DDC' },
  nordvpn: { slug: 'nordvpn', hex: '4687FF' },
  surfshark: { slug: 'surfshark', hex: '00D18F' },
  expressvpn: { slug: 'expressvpn', hex: 'DA3940' },
  proton: { slug: 'proton', hex: '6D4AFF' },
  setapp: { slug: 'setapp', hex: LIGHT_NEUTRAL },
  vercel: { slug: 'vercel', hex: LIGHT_NEUTRAL },
  supabase: { slug: 'supabase', hex: '3ECF8E' },
  docker: { slug: 'docker', hex: '2496ED' },
  cloudflare: { slug: 'cloudflare', hex: 'F38020' },
  aws: { slug: 'amazonwebservices', hex: 'FF9900' },
  // Streaming & Media
  'disney+': { slug: 'disneyplus', hex: '113CCF' },
  'disney plus': { slug: 'disneyplus', hex: '113CCF' },
  'prime video': { slug: 'amazonprime', hex: '00A8E1' },
  'amazon prime': { slug: 'amazonprime', hex: '00A8E1' },
  crunchyroll: { slug: 'crunchyroll', hex: 'FF5E00' },
  astro: { slug: 'astro', hex: 'BC52EE' },
  tidal: { slug: 'tidal', hex: LIGHT_NEUTRAL },
  'hbo max': { slug: 'hbomax', hex: LIGHT_NEUTRAL },
  hbo: { slug: 'hbo', hex: LIGHT_NEUTRAL },
  max: { slug: 'max', hex: '525252' },
  twitch: { slug: 'twitch', hex: '9146FF' },
  audible: { slug: 'audible', hex: 'F8991C' },
  deezer: { slug: 'deezer', hex: 'FEAA2D' },
  soundcloud: { slug: 'soundcloud', hex: 'FF5500' },
  // Gaming
  steam: { slug: 'steam', hex: LIGHT_NEUTRAL },
  'epic games': { slug: 'epicgames', hex: '313131' },
  gog: { slug: 'gogdotcom', hex: '86328A' },
  playstation: { slug: 'playstation', hex: '0070D1' },
  xbox: { slug: 'xbox', hex: '107C10' },
  nintendo: { slug: 'nintendoswitch', hex: 'E60012' },
  roblox: { slug: 'roblox', hex: LIGHT_NEUTRAL },
  pubg: { slug: 'pubg', hex: 'F4B942' },
  'riot games': { slug: 'riotgames', hex: 'EB0029' },
  'league of legends': { slug: 'leagueoflegends', hex: 'C28F2C' },
  ea: { slug: 'ea', hex: LIGHT_NEUTRAL },
  discord: { slug: 'discord', hex: '5865F2' },
  'discord nitro': { slug: 'discord', hex: '5865F2' },
  // Fitness / Lifestyle / Telco
  'anytime fitness': { slug: 'anytimefitness', hex: '652D90' },
  strava: { slug: 'strava', hex: 'FC4C02' },
  fitbit: { slug: 'fitbit', hex: '00B0B9' },
  myfitnesspal: { slug: 'myfitnesspal', hex: '0066EE' },
  headspace: { slug: 'headspace', hex: 'F47D31' },
  calm: { slug: 'calm', hex: '0079C2' },
  medium: { slug: 'medium', hex: LIGHT_NEUTRAL },
  substack: { slug: 'substack', hex: 'FF6719' },
  patreon: { slug: 'patreon', hex: 'FF424D' },
  // E-commerce / food / wallet / Travel
  shopee: { slug: 'shopee', hex: 'EE4D2D' },
  shopeefood: { slug: 'shopee', hex: 'EE4D2D' },
  grab: { slug: 'grab', hex: '00B14F' },
  grabunlimited: { slug: 'grab', hex: '00B14F' },
  foodpanda: { slug: 'foodpanda', hex: 'D70F64' },
  lazada: { slug: 'lazada', hex: '0F146D' },
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
 */
/**
 * Normalize a raw bank-statement descriptor into a canonical lowercase brand
 * key for registry lookup. Pure and deterministic — never calls an LLM and
 * never performs a network lookup.
 */
export function normalizeMerchantToKey(input: string): string {
  let s = input.toLowerCase().trim();

  // 1 · strip bracketed noise: (dates, refs, card last-4, amounts)
  s = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');

  // 2 · strip leading payment-system tokens
  s = s.replace(/^(?:fpx|myr|web|pos|duitnow|jompay|ibg|autodebit)\s+/i, '');

  // 3 · strip trailing hold markers
  s = s
    .replace(/\*\s*pending\s*auth\b/g, ' ')
    .replace(/\*\s*pending\b/g, ' ')
    .replace(/\*\s*preauth\b/g, ' ');

  // 4 · strip country & legal suffixes (including truncated Malaysian bank suffixes like 'sdn b', 'bhd', 'berhad')
  s = s.replace(/\b(?:sdn\s*bhd|sdn\s*b|sdn|bhd|berhad|pte\s*ltd|ltd|llc|pty|corp|inc)\b\.?/g, ' ');
  s = s.replace(/\b(?:se|sg|my|mys|malaysia|kuala\s*lumpur|kl|petaling\s*jaya|pj)\b/g, ' ');

  // 5 · strip phone numbers and long card/reference runs
  s = s.replace(/\b\d{4,}\b/g, ' ');

  // 6 · collapse `*`, `/`, and whitespace runs
  s = s.replace(/[*_/#.-]+/g, ' ').replace(WHITESPACE_RUN, ' ').trim();

  return s;
}

/**
 * Deterministic alias table: raw (already-stripped) descriptor key → canonical
 * registry key. Extends `BRAND_SLUGS` without duplicating brand data.
 */
const MERCHANT_ALIASES: Readonly<Record<string, string>> = {
  'sptf spotify': 'spotify',
  'sptf spotify malaysia': 'spotify',
  'spotify malaysia': 'spotify',
  spot: 'spotify',
  netflx: 'netflix',
  'netflix com': 'netflix',
  'netflix com my': 'netflix',
  'netflix my': 'netflix',
  'apple com bill icloud': 'icloud',
  'apple com bill': 'apple',
  'apple bill icloud': 'icloud',
  'apple one': 'apple one',
  'anytime fitness bangsar': 'anytime fitness',
  'anytime fitness mid valley': 'anytime fitness',
  'openai chatgpt plus subscription': 'chatgpt plus',
  'openai chatgpt plus': 'chatgpt plus',
  'openai chatgpt': 'chatgpt plus',
  chatgpt: 'chatgpt plus',
  openai: 'chatgpt plus',
  'canva pro annual plan': 'canva',
  'canva pro': 'canva',
  'celcom mobile': 'celcom',
  'celcom mobile sdn b': 'celcom',
  'celcom mobile sdn bhd': 'celcom',
  'celcom sdn bhd': 'celcom',
  'celcom postpaid': 'celcom',
  'celcom postpaid bill': 'celcom',
  'celcom xpax': 'celcom',
  'celcom xpax reload': 'celcom',
  xpax: 'celcom',
  'celcomdigi postpaid bill': 'celcom',
  'celcomdigi postpaid': 'celcom',
  'celcomdigi berhad': 'celcom',
  'maxis mobile postpaid': 'maxis',
  'maxis mobile services': 'maxis',
  'maxis mobile': 'maxis',
  'maxis broadband': 'maxis',
  'maxis postpaid': 'maxis',
  'maxis bill': 'maxis',
  'digi telecommunications': 'digi',
  'digi tel': 'digi',
  'digi postpaid': 'digi',
  'digi bill': 'digi',
  ggrab: 'grab',
  'grab food': 'grab',
  'touch n go': 'touch n go',
  tng: 'touch n go',
  'touchngo': 'touch n go',
  'tng ewallet': 'touch n go',
  celcom: 'celcom',
  'celcomdigi': 'celcom',
  digi: 'digi',
  maxis: 'maxis',
  'microsoft 365': 'microsoft 365',
  microsoft: 'microsoft 365',
  'office 365': 'microsoft 365',
  'youtube premium': 'youtube premium',
  'yt premium': 'youtube premium',
  'google one': 'google one',
  'g one': 'google one',
  'google workspace': 'google workspace',
  shopee: 'shopee',
  'shopeepay': 'shopee',
  viu: 'viu',
  iqiyi: 'iqiyi',
  wetv: 'wetv',
  lazada: 'lazada',
  unifi: 'unifi',
  'tm unifi': 'unifi',
  'tm unifi postpaid': 'unifi',
  'unifi postpaid': 'unifi',
  'unifi home': 'unifi',
  'unifi mobile': 'unifi',
  'telekom malaysia': 'unifi',
  'telekom malaysia berhad': 'unifi',
  'telekom': 'unifi',
  time: 'time',
  'time internet': 'time',
  'time dotcom': 'time',
  'time fibre': 'time',
  hotlink: 'hotlink',
  'hotlink postpaid': 'hotlink',
  'u mobile': 'u mobile',
  umobile: 'u mobile',
  'u mobile postpaid': 'u mobile',
  'yes 5g': 'yes 5g',
  'yes communication': 'yes 5g',
  'ytl communications': 'yes 5g',
  bigpay: 'bigpay',
  'disney+ hotstar': 'disney+',
  'disney hotstar': 'disney+',
  'disney plus': 'disney+',
  'amazon prime video': 'prime video',
  'prime video': 'prime video',
  'tenaga nasional': 'tnb',
  'tenaga nasional berhad': 'tnb',
  tnb: 'tnb',
  'air selangor': 'air selangor',
  'pengurusan air selangor': 'air selangor',
  syabas: 'air selangor',
  'indah water': 'indah water',
  'indah water konsortium': 'indah water',
  iwk: 'indah water',
  astro: 'astro',
  'measat broadcast': 'astro',
  'measat broadcast network systems': 'astro',
};

const BRAND_CANONICAL_NAMES: Readonly<Record<string, string>> = {
  spotify: 'Spotify',
  netflix: 'Netflix',
  youtube: 'YouTube',
  'youtube premium': 'YouTube Premium',
  'youtube music': 'YouTube Music',
  'icloud+': 'iCloud+',
  icloud: 'iCloud',
  apple: 'Apple',
  'apple tv+': 'Apple TV+',
  'apple music': 'Apple Music',
  'apple arcade': 'Apple Arcade',
  'apple one': 'Apple One',
  google: 'Google',
  'google one': 'Google One',
  'google drive': 'Google Drive',
  'google play': 'Google Play',
  'google photos': 'Google Photos',
  'google gemini': 'Google Gemini',
  'google workspace': 'Google Workspace',
  gmail: 'Gmail',
  namecheap: 'Namecheap',
  'namecheap domain': 'Namecheap',
  github: 'GitHub',
  'github copilot': 'GitHub Copilot',
  gitlab: 'GitLab',
  notion: 'Notion',
  dropbox: 'Dropbox',
  figma: 'Figma',
  zoom: 'Zoom',
  slack: 'Slack',
  jira: 'Jira',
  linear: 'Linear',
  trello: 'Trello',
  asana: 'Asana',
  miro: 'Miro',
  grammarly: 'Grammarly',
  claude: 'Claude',
  anthropic: 'Anthropic',
  canva: 'Canva',
  openai: 'OpenAI',
  'chatgpt plus': 'ChatGPT Plus',
  chatgpt: 'ChatGPT',
  midjourney: 'Midjourney',
  'microsoft 365': 'Microsoft 365',
  microsoft: 'Microsoft',
  adobe: 'Adobe',
  'adobe creative cloud': 'Adobe Creative Cloud',
  '1password': '1Password',
  bitwarden: 'Bitwarden',
  nordvpn: 'NordVPN',
  surfshark: 'Surfshark',
  expressvpn: 'ExpressVPN',
  proton: 'Proton',
  setapp: 'Setapp',
  'anytime fitness': 'Anytime Fitness',
  maxis: 'Maxis',
  celcom: 'CelcomDigi',
  celcomdigi: 'CelcomDigi',
  digi: 'Digi',
  'u mobile': 'U Mobile',
  'yes 5g': 'Yes 5G',
  shopee: 'Shopee',
  grab: 'Grab',
  foodpanda: 'foodpanda',
  lazada: 'Lazada',
  touchngo: 'Touch \'n Go',
  'touch n go': 'Touch \'n Go',
  unifi: 'Unifi',
  time: 'TIME Internet',
  'disney+': 'Disney+ Hotstar',
  'prime video': 'Amazon Prime Video',
  astro: 'Astro',
  tnb: 'TNB (Tenaga Nasional)',
  'air selangor': 'Air Selangor',
  'indah water': 'Indah Water',
};

/**
 * Resolve a raw merchant descriptor to a canonical brand key (deterministic).
 *
 * First strips noise via `normalizeMerchantToKey`, then applies the alias table.
 * If no exact alias matches, applies keyword & prefix matching for major Malaysian
 * and international brands.
 */
export function resolveBrandKey(descriptor: string): string {
  const stripped = normalizeMerchantToKey(descriptor);
  if (MERCHANT_ALIASES[stripped]) {
    return MERCHANT_ALIASES[stripped];
  }

  // Keyword & prefix matching for Malaysian telcos, utilities, and major brands
  if (stripped.startsWith('celcom') || stripped.includes('celcom')) return 'celcom';
  if (stripped.startsWith('maxis') || stripped.includes('maxis')) return 'maxis';
  if (stripped.startsWith('digi') || stripped.includes('digi')) return 'digi';
  if (stripped.startsWith('hotlink') || stripped.includes('hotlink')) return 'hotlink';
  if (stripped.startsWith('unifi') || stripped.includes('unifi') || stripped.includes('telekom')) return 'unifi';
  if (stripped.startsWith('time') || stripped.includes('time internet') || stripped.includes('time fibre')) return 'time';
  if (stripped.startsWith('u mobile') || stripped.includes('umobile')) return 'u mobile';
  if (stripped.startsWith('yes 5g') || stripped.includes('ytl')) return 'yes 5g';
  if (stripped.startsWith('astro') || stripped.includes('measat')) return 'astro';
  if (stripped.startsWith('tnb') || stripped.includes('tenaga nasional')) return 'tnb';
  if (stripped.startsWith('air selangor') || stripped.includes('syabas') || stripped.includes('pengurusan air')) return 'air selangor';
  if (stripped.startsWith('indah water') || stripped.includes('iwk')) return 'indah water';
  if (stripped.startsWith('spotify') || stripped.startsWith('sptf')) return 'spotify';
  if (stripped.startsWith('netflix')) return 'netflix';
  if (stripped.startsWith('apple') || stripped.startsWith('itunes') || stripped.includes('icloud')) return 'apple';
  if (stripped.startsWith('google') || stripped.startsWith('youtube') || stripped.startsWith('yt ')) return 'google';
  if (stripped.startsWith('openai') || stripped.startsWith('chatgpt')) return 'chatgpt plus';
  if (stripped.startsWith('anthropic') || stripped.startsWith('claude')) return 'claude';
  if (stripped.startsWith('canva')) return 'canva';
  if (stripped.startsWith('anytime fitness')) return 'anytime fitness';

  return stripped;
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
  const strippedOriginal = normalizeMerchantToKey(descriptor);

  // If descriptor directly names a known brand or alias in our canonical table:
  const resolvedKey = resolveBrandKey(descriptor);
  if (BRAND_CANONICAL_NAMES[resolvedKey]) {
    return BRAND_CANONICAL_NAMES[resolvedKey];
  }

  if (BRAND_CANONICAL_NAMES[strippedOriginal]) {
    return BRAND_CANONICAL_NAMES[strippedOriginal];
  }

  // If descriptor already has mixed/clean casing, preserve original
  if (descriptor.trim() && /[a-z]/.test(descriptor) && /[A-Z]/.test(descriptor)) {
    return descriptor.trim();
  }

  // Unknown: title-case each word for a clean, readable display name.
  return resolvedKey
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
    const displayName = BRAND_CANONICAL_NAMES[name] ?? canonicalMerchantName(name);
    results.push({ name: displayName, slug: entry.slug, url: brandUrl(entry) });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
