import { describe, expect, it } from 'vitest';
import {
  canonicalMerchantName,
  normalizeMerchantToKey,
  resolveBrandKey,
  resolveBrandLogo,
  searchBrands,
} from '@/features/subscriptions/brandRegistry';

describe('Brand Logo Registry & Normalization', () => {
  it('normalizes raw bank transaction descriptors into clean keys', () => {
    expect(normalizeMerchantToKey('SPTF*SPOTIFY MALAYSIA')).toBe('sptf spotify malaysia');
    expect(normalizeMerchantToKey('NETFLIX.COM/MY (REF 12345)')).toBe('netflix com');
    expect(normalizeMerchantToKey('FPX CELCOMDIGI POSTPAID')).toBe('celcomdigi postpaid');
    expect(normalizeMerchantToKey('ANYTIME FITNESS BANGSAR *PENDING')).toBe('anytime fitness bangsar');
  });

  it('maps known aliases to canonical brand keys', () => {
    expect(resolveBrandKey('SPTF*SPOTIFY MALAYSIA')).toBe('spotify');
    expect(resolveBrandKey('NETFLIX.COM/MY')).toBe('netflix');
    expect(resolveBrandKey('OPENAI CHATGPT PLUS')).toBe('chatgpt plus');
    expect(resolveBrandKey('TM UNIFI POSTPAID')).toBe('unifi');
    expect(resolveBrandKey('CELCOMDIGI POSTPAID BILL')).toBe('celcom');
  });

  it('returns clean canonical display names', () => {
    expect(canonicalMerchantName('SPTF*SPOTIFY MALAYSIA')).toBe('Spotify');
    expect(canonicalMerchantName('NETFLIX.COM MY')).toBe('Netflix');
    expect(canonicalMerchantName('OPENAI CHATGPT PLUS')).toBe('ChatGPT Plus');
    expect(canonicalMerchantName('TM UNIFI')).toBe('Unifi');
    expect(canonicalMerchantName('CELCOMDIGI POSTPAID BILL')).toBe('CelcomDigi');
    expect(canonicalMerchantName('APPLE.COM/BILL ICLOUD')).toBe('iCloud');
  });

  it('resolves Tier-1 CDN brand icons for known services', () => {
    const spotifyLogo = resolveBrandLogo('Spotify');
    expect(spotifyLogo.kind).toBe('icon');
    if (spotifyLogo.kind === 'icon') {
      expect(spotifyLogo.slug).toBe('spotify');
      expect(spotifyLogo.url).toContain('cdn.simpleicons.org/spotify');
    }

    const netflixLogo = resolveBrandLogo('Netflix');
    expect(netflixLogo.kind).toBe('icon');

    const appleLogo = resolveBrandLogo('Apple Music');
    expect(appleLogo.kind).toBe('icon');

    const claudeLogo = resolveBrandLogo('Claude');
    expect(claudeLogo.kind).toBe('icon');
  });

  it('falls back to deterministic monograms with WCAG palette for unknown merchants', () => {
    const pasarMalam = resolveBrandLogo('Pasar Malam Setapak');
    expect(pasarMalam.kind).toBe('monogram');
    if (pasarMalam.kind === 'monogram') {
      expect(pasarMalam.label).toBe('P');
      expect(pasarMalam.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('searches brand suggestions by partial query substring', () => {
    const results = searchBrands('spot');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Spotify');

    const appleResults = searchBrands('apple');
    expect(appleResults.some((r) => r.name.toLowerCase().includes('apple'))).toBe(true);

    expect(searchBrands('')).toEqual([]);
  });
});
