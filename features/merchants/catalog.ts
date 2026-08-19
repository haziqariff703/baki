import type { MerchantRule } from './types';

/**
 * Curated Malaysian Subscription Catalog (§2.1).
 *
 * 100% deterministic, zero-AI lookup catalog mapping noisy bank descriptors
 * to canonical names, domains, categories, and student discount plans.
 */
export const MALAYSIAN_SUBSCRIPTION_CATALOG: readonly MerchantRule[] = [
  // 1. Streaming & Music
  {
    id: 'spotify',
    canonicalName: 'Spotify',
    domain: 'spotify.com',
    category: 'Entertainment',
    aliases: [/sptf/i, /spotify/i],
    studentPlan: {
      standardMonthlySen: 1590,
      studentMonthlySen: 850,
      planName: 'Spotify Premium Student',
      requirement: 'SheerID university student status',
      dealUrl: 'https://www.spotify.com/my-en/student/',
    },
  },
  {
    id: 'apple_music',
    canonicalName: 'Apple Music',
    domain: 'apple.com',
    category: 'Entertainment',
    aliases: [/apple\.com\/bill/i, /itunes/i, /apple\s*music/i],
    studentPlan: {
      standardMonthlySen: 1690,
      studentMonthlySen: 890,
      planName: 'Apple Music Student (includes Apple TV+)',
      requirement: 'UNiDAYS student verification',
      dealUrl: 'https://www.apple.com/my/apple-music/',
    },
  },
  {
    id: 'youtube_premium',
    canonicalName: 'YouTube Premium',
    domain: 'youtube.com',
    category: 'Entertainment',
    aliases: [/youtube.*prem/i, /googletempo/i, /google.*yt/i],
    studentPlan: {
      standardMonthlySen: 2090,
      studentMonthlySen: 1290,
      planName: 'YouTube Student Membership',
      requirement: 'SheerID student status',
      dealUrl: 'https://www.youtube.com/premium/student',
    },
  },
  {
    id: 'netflix',
    canonicalName: 'Netflix',
    domain: 'netflix.com',
    category: 'Entertainment',
    aliases: [/nflx/i, /netflix/i],
  },
  {
    id: 'disney_hotstar',
    canonicalName: 'Disney+ Hotstar',
    domain: 'hotstar.com',
    category: 'Entertainment',
    aliases: [/hotstar/i, /disney/i],
  },

  // 2. Malaysian Telcos & Broadband
  {
    id: 'unifi',
    canonicalName: 'Unifi Broadband',
    domain: 'unifi.com.my',
    category: 'Utilities',
    aliases: [/telekom\s*malaysia/i, /tm\s*bill/i, /unifi/i],
  },
  {
    id: 'maxis',
    canonicalName: 'Maxis / Hotlink',
    domain: 'maxis.com.my',
    category: 'Telecommunications',
    aliases: [/maxis/i, /hotlink/i],
  },
  {
    id: 'celcomdigi',
    canonicalName: 'CelcomDigi',
    domain: 'celcomdigi.com',
    category: 'Telecommunications',
    aliases: [/celcom/i, /digi\s*tele/i],
  },
  {
    id: 'yes_5g',
    canonicalName: 'Yes 5G (YTL)',
    domain: 'yes.my',
    category: 'Telecommunications',
    aliases: [/ytl\s*comm/i, /yes\s*5g/i],
  },
  {
    id: 'time_internet',
    canonicalName: 'TIME Internet',
    domain: 'time.com.my',
    category: 'Telecommunications',
    aliases: [/time\s*dotcom/i, /time\s*fibre/i, /time\s*internet/i],
  },

  // 3. Software, AI & Productivity
  {
    id: 'chatgpt',
    canonicalName: 'ChatGPT Plus',
    domain: 'openai.com',
    category: 'Software',
    aliases: [/openai/i, /chatgpt/i],
  },
  {
    id: 'canva',
    canonicalName: 'Canva Pro',
    domain: 'canva.com',
    category: 'Software',
    aliases: [/canva/i],
    studentPlan: {
      standardMonthlySen: 2990,
      studentMonthlySen: 0,
      planName: 'Canva for Education / Students',
      requirement: 'Verified university student email (.edu.my)',
      dealUrl: 'https://www.canva.com/education/students/',
    },
  },
  {
    id: 'github_copilot',
    canonicalName: 'GitHub Copilot / Pro',
    domain: 'github.com',
    category: 'Software',
    aliases: [/github/i],
    studentPlan: {
      standardMonthlySen: 4500,
      studentMonthlySen: 0,
      planName: 'GitHub Student Developer Pack (Free Copilot & Pro)',
      requirement: 'GitHub Student Pack verification with student ID',
      dealUrl: 'https://education.github.com/pack',
    },
  },
  {
    id: 'notion',
    canonicalName: 'Notion Plus',
    domain: 'notion.so',
    category: 'Software',
    aliases: [/notion/i],
    studentPlan: {
      standardMonthlySen: 4500,
      studentMonthlySen: 0,
      planName: 'Notion for Education (Free Plus Plan)',
      requirement: 'Sign up with .edu.my student email',
      dealUrl: 'https://www.notion.so/product/notion-for-education',
    },
  },
  {
    id: 'adobe_cc',
    canonicalName: 'Adobe Creative Cloud',
    domain: 'adobe.com',
    category: 'Software',
    aliases: [/adobe/i],
    studentPlan: {
      standardMonthlySen: 26000,
      studentMonthlySen: 8500,
      planName: 'Adobe Students & Teachers 60%+ Off',
      requirement: 'Institutional student email verification',
      dealUrl: 'https://www.adobe.com/my/creativecloud/buy/students.html',
    },
  },
  {
    id: 'icloud',
    canonicalName: 'iCloud+',
    domain: 'apple.com',
    category: 'Software',
    aliases: [/icloud/i, /apple\s*storage/i],
  },
  {
    id: 'google_one',
    canonicalName: 'Google One',
    domain: 'google.com',
    category: 'Software',
    aliases: [/google\s*storage/i, /google\s*one/i, /google\s*gsuite/i],
  },

  // 4. Fitness & Memberships
  {
    id: 'anytime_fitness',
    canonicalName: 'Anytime Fitness',
    domain: 'anytimefitness.my',
    category: 'Fitness',
    aliases: [/anytime\s*fit/i],
  },
  {
    id: 'fitness_first',
    canonicalName: 'Fitness First',
    domain: 'fitnessfirst.com.my',
    category: 'Fitness',
    aliases: [/fitness\s*first/i],
  },
  {
    id: 'celebrity_fitness',
    canonicalName: 'Celebrity Fitness',
    domain: 'celebrityfitness.com.my',
    category: 'Fitness',
    aliases: [/celebrity\s*fit/i],
  },
  {
    id: 'classpass',
    canonicalName: 'ClassPass',
    domain: 'classpass.com',
    category: 'Fitness',
    aliases: [/classpass/i],
  },
];
