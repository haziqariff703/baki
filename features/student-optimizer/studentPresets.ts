/**
 * Curated catalog of popular Malaysian student subscriptions & verified discounts.
 *
 * Prices stored strictly as integer sen (e.g. RM 8.50 -> 850).
 * Reference: Malaysian student pricing plans 2026.
 */
import type { StudentPreset } from './types';

export const STUDENT_PRESETS: readonly StudentPreset[] = [
  {
    id: 'spotify-student',
    name: 'Spotify',
    category: 'Entertainment',
    defaultBillingDay: 1,
    studentPriceSen: 850, // RM 8.50/mo
    standardPriceSen: 1590, // RM 15.90/mo
    monthlySavingsSen: 740, // RM 7.40/mo
    discountPercentage: 47,
    tag: 'Save RM7.40/mo',
    perkDescription: 'Premium ad-free music & offline downloads with SheerID student verification.',
    verificationMethod: 'sheerid',
    defaultScoreBreakdown: {
      usage: 5,
      necessity: 3,
      affordability: 5,
      uniqueness: 4,
      satisfaction: 5,
    },
  },
  {
    id: 'apple-music-student',
    name: 'Apple Music',
    category: 'Entertainment',
    defaultBillingDay: 1,
    studentPriceSen: 590, // RM 5.90/mo
    standardPriceSen: 1690, // RM 16.90/mo
    monthlySavingsSen: 1100, // RM 11.00/mo
    discountPercentage: 65,
    tag: 'Includes Free Apple TV+',
    perkDescription: 'Lossless audio + Spatial Audio + includes free Apple TV+ streaming access via UNiDAYS.',
    verificationMethod: 'unidays',
    defaultScoreBreakdown: {
      usage: 4,
      necessity: 3,
      affordability: 5,
      uniqueness: 5,
      satisfaction: 5,
    },
  },
  {
    id: 'youtube-premium-student',
    name: 'YouTube Premium',
    category: 'Entertainment',
    defaultBillingDay: 1,
    studentPriceSen: 1090, // RM 10.90/mo
    standardPriceSen: 1790, // RM 17.90/mo
    monthlySavingsSen: 700, // RM 7.00/mo
    discountPercentage: 39,
    tag: 'Save RM7.00/mo',
    perkDescription: 'Ad-free YouTube, background play, offline downloads & YouTube Music with SheerID verification.',
    verificationMethod: 'sheerid',
    defaultScoreBreakdown: {
      usage: 5,
      necessity: 3,
      affordability: 4,
      uniqueness: 4,
      satisfaction: 4,
    },
  },
  {
    id: 'netflix-mobile',
    name: 'Netflix',
    category: 'Entertainment',
    defaultBillingDay: 5,
    studentPriceSen: 1890, // RM 18.90/mo (Mobile Tier)
    standardPriceSen: 4990, // RM 49.90/mo (Standard HD)
    monthlySavingsSen: 3100, // RM 31.00/mo
    discountPercentage: 62,
    tag: 'Mobile Plan RM18.90',
    perkDescription: 'Full Netflix catalog streamed in standard definition on 1 phone or tablet.',
    verificationMethod: 'none',
    defaultScoreBreakdown: {
      usage: 4,
      necessity: 2,
      affordability: 4,
      uniqueness: 3,
      satisfaction: 4,
    },
  },
  {
    id: 'icloud-50gb',
    name: 'iCloud+ 50GB',
    category: 'Software',
    defaultBillingDay: 1,
    studentPriceSen: 490, // RM 4.90/mo
    standardPriceSen: 1190, // RM 11.90/mo (200GB plan)
    monthlySavingsSen: 700,
    discountPercentage: 58,
    tag: 'Only RM4.90/mo',
    perkDescription: 'Essential 50GB iPhone backup, iCloud Private Relay, and custom email domain.',
    verificationMethod: 'none',
    defaultScoreBreakdown: {
      usage: 5,
      necessity: 5,
      affordability: 5,
      uniqueness: 4,
      satisfaction: 5,
    },
  },
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    category: 'AI Tools',
    defaultBillingDay: 15,
    studentPriceSen: 9900, // RM 99.00/mo ($20 USD)
    standardPriceSen: 9900,
    monthlySavingsSen: 0,
    discountPercentage: 0,
    tag: 'Research & Study',
    perkDescription: 'GPT-4o, Canvas, advanced coding assistance, and unlimited file analysis for university assignments.',
    verificationMethod: 'none',
    defaultScoreBreakdown: {
      usage: 5,
      necessity: 4,
      affordability: 2,
      uniqueness: 5,
      satisfaction: 5,
    },
  },
  {
    id: 'claude-pro',
    name: 'Claude Pro',
    category: 'AI Tools',
    defaultBillingDay: 15,
    studentPriceSen: 9900, // RM 99.00/mo ($20 USD)
    standardPriceSen: 9900,
    monthlySavingsSen: 0,
    discountPercentage: 0,
    tag: 'Coding & Thesis',
    perkDescription: 'Claude 3.7 Sonnet, Artifacts, Extended Thinking, Projects, and 5x limits for engineering and research.',
    verificationMethod: 'none',
    defaultScoreBreakdown: {
      usage: 5,
      necessity: 4,
      affordability: 2,
      uniqueness: 5,
      satisfaction: 5,
    },
  },
  {
    id: 'hotlink-pantas',
    name: 'Hotlink Pantas 5G',
    category: 'Telco',
    defaultBillingDay: 1,
    studentPriceSen: 3500, // RM 35.00/mo
    standardPriceSen: 6000,
    monthlySavingsSen: 2500,
    discountPercentage: 42,
    tag: 'Campus 5G Data',
    perkDescription: 'High-speed 5G mobile data with unlimited calls and hotspot for student tethering.',
    verificationMethod: 'none',
    defaultScoreBreakdown: {
      usage: 5,
      necessity: 5,
      affordability: 4,
      uniqueness: 3,
      satisfaction: 4,
    },
  },
  {
    id: 'adobe-student',
    name: 'Adobe Creative Cloud',
    category: 'Software',
    defaultBillingDay: 1,
    studentPriceSen: 9000, // RM 90.00/mo (Student discount)
    standardPriceSen: 24500, // RM 245.00/mo (Full commercial)
    monthlySavingsSen: 15500, // RM 155.00/mo
    discountPercentage: 63,
    tag: 'Save RM155/mo (63% OFF)',
    perkDescription: 'Photoshop, Illustrator, Premiere Pro & full suite with official edu student email verification.',
    verificationMethod: 'student_email',
    defaultScoreBreakdown: {
      usage: 4,
      necessity: 4,
      affordability: 3,
      uniqueness: 5,
      satisfaction: 4,
    },
  },
];
