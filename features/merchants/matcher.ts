import { MALAYSIAN_SUBSCRIPTION_CATALOG } from './catalog';
import type { ResolvedMerchant } from './types';

const NOISE_WORDS = [
  /\bSDN\s+BHD\b/gi,
  /\bBHD\b/gi,
  /\bBERHAD\b/gi,
  /\bLTD\b/gi,
  /\bCORP\b/gi,
  /\bINC\b/gi,
  /\bPAYMENT\b/gi,
  /\bAUTOPAY\b/gi,
  /\bDIRECT\s+DEBIT\b/gi,
  /\bRECURRING\b/gi,
  /\bKUALA\s+LUMPUR\b/gi,
  /\bPETALING\s+JAYA\b/gi,
  /\bSPTF\b/gi,
  /\bNFLX\b/gi,
  /\bMY\b/g,
  /\bSE\b/g,
  /\bKUL\b/g,
  /[*#_]/g,
];

/**
 * Removes noisy corporate suffixes and banking artifacts from merchant descriptors.
 */
export function cleanDescriptor(raw: string): string {
  let cleaned = raw;
  for (const regex of NOISE_WORDS) {
    cleaned = cleaned.replace(regex, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Resolves a raw transaction descriptor into a clean canonical merchant.
 * 100% deterministic, sub-millisecond CPU execution, zero external API or GPU needed.
 */
export function resolveMerchant(rawDescriptor: string): ResolvedMerchant {
  const cleaned = cleanDescriptor(rawDescriptor);

  for (const rule of MALAYSIAN_SUBSCRIPTION_CATALOG) {
    for (const pattern of rule.aliases) {
      if (typeof pattern === 'string') {
        if (
          rawDescriptor.toLowerCase().includes(pattern.toLowerCase()) ||
          cleaned.toLowerCase().includes(pattern.toLowerCase())
        ) {
          return {
            canonicalName: rule.canonicalName,
            domain: rule.domain,
            category: rule.category,
            matchedRule: rule,
            isKnownMerchant: true,
          };
        }
      } else if (pattern.test(rawDescriptor) || pattern.test(cleaned)) {
        return {
          canonicalName: rule.canonicalName,
          domain: rule.domain,
          category: rule.category,
          matchedRule: rule,
          isKnownMerchant: true,
        };
      }
    }
  }

  return {
    canonicalName: cleaned.length > 0 ? cleaned : rawDescriptor,
    category: 'Other',
    isKnownMerchant: false,
  };
}
